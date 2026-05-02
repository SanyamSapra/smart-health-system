"""
dataset_merger.py
=================
Merges multiple symptom-disease datasets into a single unified training CSV.

Supported source datasets
─────────────────────────
DS-1  Kaggle "Disease Symptom Prediction" (Pranay Patil)
      • 42 diseases, 132 symptoms, ~4,920 rows
      • Format: disease col + up to 17 symptom string columns

DS-2  Kaggle "Symptom-Disease Dataset" (large, multi-source)
      • ~300+ diseases, 300+ symptoms, ~100k+ rows
      • Format: long-format CSV  (disease, symptom, weight)

DS-3  Mendeley "Disease-Symptom" (773 diseases, 377 symptoms, ~246k rows)
      • Format: disease + binary symptom columns

All sources are normalised into a single wide binary format:
      disease | symptom_1 | symptom_2 | ... | symptom_N

Usage
-----
    from src.dataset_merger import DatasetMerger
    merger = DatasetMerger()
    df = merger.merge_all()   # returns unified DataFrame
    merger.save(df)
"""

import os
import logging
from pathlib import Path

import numpy as np
import pandas as pd

from src.utils import normalise_symptom, normalise_symptom_list, DATASET_DIR

logger = logging.getLogger("dataset_merger")

# ─── Constants ────────────────────────────────────────────────────────────────

UNIFIED_CSV = DATASET_DIR / "unified_dataset.csv"

# Minimum number of occurrences a symptom must have across the dataset
MIN_SYMPTOM_FREQ = 10


class DatasetMerger:
    """
    Merge heterogeneous symptom-disease CSVs into one binary wide-format frame.
    """

    def __init__(self, dataset_dir: Path = DATASET_DIR):
        self.dataset_dir = dataset_dir

    # ─── Public API ─────────────────────────────────────────────────────────

    def merge_all(self) -> pd.DataFrame:
        """
        Auto-detect CSV files in dataset/ and merge them.

        Returns a clean binary-symptom DataFrame ready for ML training.
        """
        frames: list[pd.DataFrame] = []

        csv_files = sorted(self.dataset_dir.glob("*.csv"))
        if not csv_files:
            logger.warning(
                "No CSV files found in %s — generating synthetic demo data.",
                self.dataset_dir,
            )
            return self._generate_demo_dataset()

        for csv_path in csv_files:
            if csv_path.name.startswith("unified"):
                continue
            logger.info("Loading: %s", csv_path.name)
            try:
                df = self._load_and_normalise(csv_path)
                if df is not None and len(df) > 0:
                    frames.append(df)
                    logger.info(
                        "  → %d rows, %d symptoms", len(df), df.shape[1] - 1
                    )
            except Exception as exc:
                logger.error("Failed to load %s: %s", csv_path.name, exc)

        if not frames:
            logger.warning("All CSVs failed to load — using synthetic demo data.")
            return self._generate_demo_dataset()

        merged = self._merge_frames(frames)
        merged = self._clean(merged)
        logger.info(
            "Merged dataset: %d rows | %d diseases | %d symptoms",
            len(merged),
            merged["disease"].nunique(),
            merged.shape[1] - 1,
        )
        return merged

    def save(self, df: pd.DataFrame, path: Path = UNIFIED_CSV) -> Path:
        df.to_csv(path, index=False)
        logger.info("Unified dataset saved → %s", path)
        return path

    # ─── Private — format detection & loading ────────────────────────────────

    def _load_and_normalise(self, path: Path) -> pd.DataFrame | None:
        raw = pd.read_csv(path, low_memory=False)
        raw.columns = [c.strip().lower().replace(" ", "_") for c in raw.columns]

        # Detect format
        if self._is_wide_string_format(raw):
            return self._parse_wide_string(raw)
        elif self._is_long_format(raw):
            return self._parse_long_format(raw)
        elif self._is_wide_binary_format(raw):
            return self._parse_wide_binary(raw)
        else:
            logger.warning("Unrecognised format in %s — skipping.", path.name)
            return None

    # ── Format detectors ────────────────────────────────────────────────────

    @staticmethod
    def _is_wide_string_format(df: pd.DataFrame) -> bool:
        """Columns are 'disease', 'symptom_1', 'symptom_2', ..."""
        disease_col = any("disease" in c or "prognosis" in c for c in df.columns)
        symptom_col = any(
            c.startswith("symptom") for c in df.columns
        )
        return disease_col and symptom_col

    @staticmethod
    def _is_long_format(df: pd.DataFrame) -> bool:
        """Two columns: disease + symptom (possibly + weight)"""
        cols = set(df.columns)
        return (
            len(df.columns) <= 4
            and any("disease" in c or "prognosis" in c for c in cols)
            and any("symptom" in c for c in cols)
        )

    @staticmethod
    def _is_wide_binary_format(df: pd.DataFrame) -> bool:
        """disease col + many 0/1 cols"""
        disease_col = any("disease" in c or "prognosis" in c for c in df.columns)
        if not disease_col:
            return False
        non_disease = [c for c in df.columns if "disease" not in c and "prognosis" not in c]
        if not non_disease:
            return False
        sample = df[non_disease].dropna()
        if sample.empty:
            return False
        uniques = sample.apply(lambda s: s.dropna().unique())
        binary_cols = sum(
            all(v in (0, 1, "0", "1", True, False) for v in vals) for vals in uniques
        )
        return binary_cols > len(non_disease) * 0.6

    # ── Format parsers ───────────────────────────────────────────────────────

    def _parse_wide_string(self, df: pd.DataFrame) -> pd.DataFrame:
        """Kaggle DS-1 style: disease + symptom_1..symptom_17"""
        disease_col = next(
            c for c in df.columns if "disease" in c or "prognosis" in c
        )
        symptom_cols = [c for c in df.columns if c != disease_col]

        records: list[dict] = []
        for _, row in df.iterrows():
            disease = str(row[disease_col]).strip()
            symptoms = [
                normalise_symptom(str(row[c]))
                for c in symptom_cols
                if pd.notna(row[c]) and str(row[c]).strip() not in ("", "nan")
            ]
            if disease and symptoms:
                records.append({"disease": disease, "symptoms": symptoms})

        return self._records_to_binary(records)

    def _parse_long_format(self, df: pd.DataFrame) -> pd.DataFrame:
        """Long format: one row per (disease, symptom) pair"""
        disease_col = next(
            c for c in df.columns if "disease" in c or "prognosis" in c
        )
        symptom_col = next(c for c in df.columns if "symptom" in c)

        grouped = (
            df.groupby(disease_col)[symptom_col]
            .apply(lambda s: normalise_symptom_list(s.dropna().tolist()))
            .reset_index()
        )
        records = [
            {"disease": r[disease_col], "symptoms": r[symptom_col]}
            for _, r in grouped.iterrows()
        ]
        return self._records_to_binary(records)

    def _parse_wide_binary(self, df: pd.DataFrame) -> pd.DataFrame:
        """Already binary — rename disease col and normalise symptom column names"""
        disease_col = next(
            c for c in df.columns if "disease" in c or "prognosis" in c
        )
        symptom_cols = [c for c in df.columns if c != disease_col]

        result = df[[disease_col] + symptom_cols].copy()
        result = result.rename(columns={disease_col: "disease"})
        result.columns = ["disease"] + [
            normalise_symptom(c) for c in symptom_cols
        ]
        result = result.loc[:, ~result.columns.duplicated()]
        # Convert to int8
        for c in result.columns[1:]:
            result[c] = pd.to_numeric(result[c], errors="coerce").fillna(0).astype(np.int8)
        return result

    # ─── Helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _records_to_binary(records: list[dict]) -> pd.DataFrame:
        """Convert list of {disease, symptoms[]} dicts to a binary wide DataFrame"""
        all_symptoms: set[str] = set()
        for r in records:
            all_symptoms.update(r["symptoms"])
        symptom_list = sorted(all_symptoms)

        rows = []
        for r in records:
            row: dict = {"disease": r["disease"]}
            present = set(r["symptoms"])
            for s in symptom_list:
                row[s] = np.int8(1 if s in present else 0)
            rows.append(row)
        return pd.DataFrame(rows)

    def _merge_frames(self, frames: list[pd.DataFrame]) -> pd.DataFrame:
        """
        Union-merge DataFrames with potentially different symptom columns.
        Missing symptom columns in any frame are filled with 0.
        """
        merged = pd.concat(frames, axis=0, ignore_index=True, sort=False)
        merged = merged.fillna(0)
        # Ensure non-disease cols are int8
        disease_col = "disease"
        for c in merged.columns:
            if c != disease_col:
                merged[c] = merged[c].astype(np.int8)
        return merged

    def _clean(self, df: pd.DataFrame) -> pd.DataFrame:
        """Remove duplicates, low-frequency symptoms, and bad rows"""
        # Drop rows without disease label
        df = df[df["disease"].notna() & (df["disease"].str.strip() != "")]

        # Standardise disease names
        df["disease"] = df["disease"].str.strip().str.title()

        # Remove symptom columns with almost no signal
        symptom_cols = [c for c in df.columns if c != "disease"]
        freq = df[symptom_cols].sum()
        keep = freq[freq >= MIN_SYMPTOM_FREQ].index.tolist()
        df = df[["disease"] + keep]

        # Drop duplicate rows
        df = df.drop_duplicates()

        # Drop diseases with fewer than 5 samples (not enough to learn from)
        counts = df["disease"].value_counts()
        valid_diseases = counts[counts >= 5].index
        df = df[df["disease"].isin(valid_diseases)]

        df = df.reset_index(drop=True)
        return df

    # ─── Demo data (used when no CSVs are present) ────────────────────────────

    def _generate_demo_dataset(self) -> pd.DataFrame:
        """
        Generate a small but realistic synthetic dataset so the whole pipeline
        can run and be tested without downloading real data files.
        """
        logger.info("Generating synthetic demo dataset …")

        DISEASES = {
            "Malaria": ["fever", "chills", "sweating", "headache", "nausea", "vomiting",
                        "muscle_pain", "fatigue", "body_pain"],
            "Dengue": ["fever", "severe_headache", "joint_pain", "muscle_pain",
                       "skin_rash", "nausea", "vomiting", "fatigue", "eye_pain"],
            "Typhoid": ["fever", "abdominal_pain", "headache", "fatigue", "diarrhoea",
                        "vomiting", "loss_of_appetite", "rose_spots"],
            "Influenza": ["fever", "cough", "sore_throat", "runny_nose", "muscle_pain",
                          "headache", "fatigue", "chills"],
            "Common Cold": ["runny_nose", "sore_throat", "cough", "sneezing",
                            "nasal_congestion", "mild_fever", "fatigue"],
            "Pneumonia": ["fever", "cough", "breathlessness", "chest_pain",
                          "chills", "fatigue", "rapid_breathing"],
            "Tuberculosis": ["persistent_cough", "blood_in_sputum", "fatigue",
                             "weight_loss", "night_sweats", "fever", "chest_pain"],
            "Diabetes": ["increased_thirst", "frequent_urination", "fatigue",
                         "blurred_vision", "slow_healing", "weight_loss"],
            "Hypertension": ["headache", "dizziness", "blurred_vision",
                              "chest_pain", "shortness_of_breath", "nausea"],
            "Asthma": ["breathlessness", "cough", "chest_tightness",
                       "wheezing", "fatigue"],
            "Gastroenteritis": ["nausea", "vomiting", "diarrhoea", "abdominal_pain",
                                "fever", "fatigue", "dehydration"],
            "Appendicitis": ["severe_abdominal_pain", "nausea", "vomiting",
                             "fever", "loss_of_appetite", "abdominal_rigidity"],
            "Hepatitis": ["yellowing_of_skin", "yellowing_of_eyes", "fatigue",
                          "nausea", "abdominal_pain", "dark_urine", "loss_of_appetite"],
            "Chickenpox": ["skin_rash", "itching", "fever", "fatigue",
                           "loss_of_appetite", "headache", "blisters"],
            "Measles": ["fever", "cough", "runny_nose", "skin_rash",
                        "red_eyes", "koplik_spots", "fatigue"],
            "COVID-19": ["fever", "cough", "breathlessness", "fatigue",
                         "loss_of_smell", "loss_of_taste", "headache", "body_pain"],
            "Migraine": ["severe_headache", "nausea", "vomiting", "light_sensitivity",
                         "sound_sensitivity", "blurred_vision", "dizziness"],
            "Urinary Tract Infection": ["burning_urination", "frequent_urination",
                                        "cloudy_urine", "abdominal_pain",
                                        "fever", "back_pain"],
            "Anemia": ["fatigue", "pale_skin", "breathlessness", "dizziness",
                       "chest_pain", "cold_hands", "headache"],
            "Arthritis": ["joint_pain", "joint_swelling", "stiffness",
                          "fatigue", "redness", "reduced_range_of_motion"],
        }

        all_symptoms = sorted(
            {s for syms in DISEASES.values() for s in syms}
        )

        rng = np.random.default_rng(42)
        rows = []
        for disease, core_symptoms in DISEASES.items():
            n_samples = rng.integers(80, 150)
            for _ in range(n_samples):
                row: dict = {"disease": disease}
                for s in all_symptoms:
                    if s in core_symptoms:
                        row[s] = int(rng.random() > 0.15)   # 85% chance present
                    else:
                        row[s] = int(rng.random() < 0.08)   # 8% noise
                rows.append(row)

        df = pd.DataFrame(rows)
        self.save(df)
        logger.info(
            "Demo dataset: %d rows | %d diseases | %d symptoms",
            len(df), df["disease"].nunique(), len(all_symptoms),
        )
        return df
