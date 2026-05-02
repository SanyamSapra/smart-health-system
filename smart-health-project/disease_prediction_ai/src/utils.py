"""
utils.py — Shared utility functions for the Disease Prediction System
"""

import re
import os
import json
import logging
import numpy as np
import pandas as pd
from pathlib import Path

# ─── Logging ────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("utils")

# ─── Path helpers ────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = ROOT / "dataset"
MODELS_DIR = ROOT / "models"
SRC_DIR = ROOT / "src"

for d in (DATASET_DIR, MODELS_DIR, SRC_DIR):
    d.mkdir(parents=True, exist_ok=True)


# ─── Symptom normalisation ───────────────────────────────────────────────────

# Common aliases → canonical name
SYMPTOM_ALIASES: dict[str, str] = {
    "high temperature": "fever",
    "high fever": "fever",
    "running nose": "runny_nose",
    "stuffy nose": "nasal_congestion",
    "blocked nose": "nasal_congestion",
    "chest tightness": "chest_pain",
    "shortness of breath": "breathlessness",
    "difficulty breathing": "breathlessness",
    "trouble breathing": "breathlessness",
    "sore muscles": "muscle_pain",
    "muscle aches": "muscle_pain",
    "body aches": "body_pain",
    "body pain": "body_pain",
    "stomach ache": "abdominal_pain",
    "stomach pain": "abdominal_pain",
    "tummy ache": "abdominal_pain",
    "feeling sick": "nausea",
    "throwing up": "vomiting",
    "loose motions": "diarrhoea",
    "loose stools": "diarrhoea",
    "tired": "fatigue",
    "tiredness": "fatigue",
    "exhausted": "fatigue",
    "loss of energy": "fatigue",
    "low energy": "fatigue",
    "spinning": "dizziness",
    "vertigo": "dizziness",
    "light headedness": "dizziness",
    "light-headedness": "dizziness",
    "skin rash": "skin_rash",
    "rashes": "skin_rash",
    "itching": "itching",
    "itchy skin": "itching",
    "sweating": "sweating",
    "excessive sweating": "sweating",
    "night sweats": "sweating",
    "joint aches": "joint_pain",
    "joint ache": "joint_pain",
    "yellow skin": "yellowing_of_skin",
    "yellow eyes": "yellowing_of_eyes",
    "jaundice": "yellowing_of_skin",
    "weight loss": "weight_loss",
    "losing weight": "weight_loss",
    "back ache": "back_pain",
    "backache": "back_pain",
    "headache": "headache",
    "head pain": "headache",
    "migraines": "headache",
    "migraine": "headache",
}


def normalise_symptom(raw: str) -> str:
    """
    Convert a free-text symptom string to a canonical snake_case token.

    Steps
    -----
    1. Lowercase + strip
    2. Check alias table
    3. Replace whitespace / hyphens with underscores
    4. Remove non-alphanumeric chars (except underscore)
    """
    s = raw.strip().lower()
    s = re.sub(r"['\-–—]", " ", s)          # normalise dashes / apostrophes
    s = re.sub(r"\s+", " ", s).strip()       # collapse whitespace

    # Check full-phrase alias first
    if s in SYMPTOM_ALIASES:
        return SYMPTOM_ALIASES[s]

    # Check partial alias (substring match)
    for alias, canonical in SYMPTOM_ALIASES.items():
        if alias in s:
            return canonical

    # Generic normalisation
    s = re.sub(r"[^a-z0-9 ]", "", s)
    s = s.replace(" ", "_")
    return s


def normalise_symptom_list(raw_list: list[str]) -> list[str]:
    """Normalise a list of raw symptom strings."""
    seen: set[str] = set()
    result: list[str] = []
    for raw in raw_list:
        norm = normalise_symptom(raw)
        if norm and norm not in seen:
            seen.add(norm)
            result.append(norm)
    return result


def parse_manual_input(text: str) -> list[str]:
    """
    Parse a comma/semicolon-separated string of manually entered symptoms.

    Returns a deduplicated, normalised list.
    """
    parts = re.split(r"[,;]+", text)
    return normalise_symptom_list([p for p in parts if p.strip()])


# ─── Binary vector helpers ───────────────────────────────────────────────────

def build_symptom_vector(
    present_symptoms: list[str],
    all_symptoms: list[str],
) -> np.ndarray:
    """
    Build a binary (0/1) numpy array.

    Parameters
    ----------
    present_symptoms : list[str]
        Normalised symptom names the patient has.
    all_symptoms : list[str]
        Ordered list of ALL symptom columns in the model.

    Returns
    -------
    np.ndarray, shape (len(all_symptoms),)
    """
    vec = np.zeros(len(all_symptoms), dtype=np.int8)
    symptom_index = {s: i for i, s in enumerate(all_symptoms)}
    for sym in present_symptoms:
        if sym in symptom_index:
            vec[symptom_index[sym]] = 1
    return vec


# ─── Model metadata I/O ──────────────────────────────────────────────────────

def save_metadata(meta: dict, path: Path | str) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(meta, f, indent=2)
    logger.info("Metadata saved → %s", path)


def load_metadata(path: Path | str) -> dict:
    with open(path) as f:
        return json.load(f)


# ─── Pretty print helpers ─────────────────────────────────────────────────────

def format_predictions(predictions: list[dict]) -> str:
    """
    Format top-N predictions for console display.

    Parameters
    ----------
    predictions : list of {"disease": str, "probability": float}

    Returns
    -------
    str
    """
    lines = ["\n🩺  Top Disease Predictions\n" + "─" * 36]
    for rank, p in enumerate(predictions, 1):
        bar = "█" * int(p["probability"] * 20)
        lines.append(
            f"  {rank}. {p['disease']:<30}  {p['probability']*100:5.1f}%  {bar}"
        )
    lines.append("─" * 36)
    return "\n".join(lines)
