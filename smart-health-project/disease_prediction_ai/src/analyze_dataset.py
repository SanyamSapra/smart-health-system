"""
analyze_dataset.py
==================
Analyses the unified dataset, computes feature importance via Random Forest,
and identifies the TOP-20 most predictive symptoms.

Usage
-----
    from src.analyze_dataset import DatasetAnalyzer
    analyzer = DatasetAnalyzer(df)
    report   = analyzer.analyse()   # returns full analysis dict
    top20    = analyzer.top_symptoms(n=20)
"""

import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

from src.utils import MODELS_DIR, save_metadata

logger = logging.getLogger("analyze_dataset")

ANALYSIS_PATH = MODELS_DIR / "dataset_analysis.json"


class DatasetAnalyzer:
    """
    Wraps a merged DataFrame and exposes analysis helpers.
    """

    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self.symptom_cols: list[str] = [c for c in df.columns if c != "disease"]
        self.le = LabelEncoder()
        self._importance: pd.Series | None = None

    # ─── Public API ──────────────────────────────────────────────────────────

    def analyse(self) -> dict:
        """
        Run full analysis:
        • class distribution
        • symptom frequency
        • feature importance (Random Forest)

        Returns a dict that is also saved to models/dataset_analysis.json.
        """
        logger.info("Analysing dataset …")

        y = self.le.fit_transform(self.df["disease"])
        X = self.df[self.symptom_cols].values

        # Feature importance
        logger.info("  Training Random Forest for feature importance …")
        rf = RandomForestClassifier(
            n_estimators=200,
            max_depth=None,
            min_samples_split=2,
            n_jobs=-1,
            random_state=42,
        )
        rf.fit(X, y)
        self._importance = pd.Series(
            rf.feature_importances_, index=self.symptom_cols
        ).sort_values(ascending=False)

        # Symptom frequency (proportion of rows where symptom == 1)
        freq = self.df[self.symptom_cols].mean().sort_values(ascending=False)

        # Class distribution
        class_dist = self.df["disease"].value_counts().to_dict()

        report = {
            "n_rows": int(len(self.df)),
            "n_diseases": int(self.df["disease"].nunique()),
            "n_symptoms": int(len(self.symptom_cols)),
            "diseases": sorted(self.df["disease"].unique().tolist()),
            "class_distribution": class_dist,
            "top_20_symptoms_by_importance": self._importance.head(20).index.tolist(),
            "top_20_importance_scores": self._importance.head(20).round(6).tolist(),
            "top_30_symptoms_by_frequency": freq.head(30).index.tolist(),
            "all_symptoms": self.symptom_cols,
        }

        save_metadata(report, ANALYSIS_PATH)
        logger.info(
            "Analysis complete: %d diseases, %d symptoms.", report["n_diseases"], report["n_symptoms"]
        )
        return report

    def top_symptoms(self, n: int = 20) -> list[str]:
        """Return the top-N most important symptoms (requires analyse() first)."""
        if self._importance is None:
            self.analyse()
        return self._importance.head(n).index.tolist()

    @property
    def importance(self) -> pd.Series:
        if self._importance is None:
            self.analyse()
        return self._importance

    # ─── Static loader ────────────────────────────────────────────────────────

    @staticmethod
    def load_report() -> dict | None:
        if ANALYSIS_PATH.exists():
            with open(ANALYSIS_PATH) as f:
                return json.load(f)
        return None
