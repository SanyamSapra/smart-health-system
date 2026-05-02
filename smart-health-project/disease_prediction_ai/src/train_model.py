"""
train_model.py
==============
Trains, evaluates, and persists the disease prediction model.

Model choices
─────────────
  • Primary  : XGBoost (best accuracy on tabular binary data)
  • Fallback : Random Forest (always available)
  • Ensemble : Voting Classifier combining both (optional)

Saved artefacts (in models/)
─────────────────────────────
  model.joblib              — trained classifier
  label_encoder.joblib      — LabelEncoder for disease names
  symptom_list.json         — ordered list of all symptom columns
  training_report.json      — accuracy, classification report, etc.

Usage
-----
    from src.train_model import ModelTrainer
    trainer = ModelTrainer(df)
    trainer.train()
"""

import json
import logging
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder

warnings.filterwarnings("ignore")

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

from src.utils import MODELS_DIR, save_metadata

logger = logging.getLogger("train_model")

MODEL_PATH   = MODELS_DIR / "model.joblib"
LE_PATH      = MODELS_DIR / "label_encoder.joblib"
SYMS_PATH    = MODELS_DIR / "symptom_list.json"
REPORT_PATH  = MODELS_DIR / "training_report.json"


class ModelTrainer:
    """
    Trains a disease prediction classifier on a binary symptom DataFrame.
    """

    def __init__(self, df: pd.DataFrame, test_size: float = 0.2):
        self.df = df.copy()
        self.test_size = test_size
        self.symptom_cols: list[str] = [c for c in df.columns if c != "disease"]
        self.le = LabelEncoder()

    # ─── Public API ──────────────────────────────────────────────────────────

    def train(self) -> dict:
        """
        Full training pipeline:
        1. Encode labels
        2. Train/test split
        3. Fit model
        4. Evaluate
        5. Save artefacts

        Returns training report dict.
        """
        logger.info("Preparing data …")
        X = self.df[self.symptom_cols].values.astype(np.float32)
        y = self.le.fit_transform(self.df["disease"])

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=self.test_size, random_state=42, stratify=y
        )
        logger.info(
            "Train: %d rows | Test: %d rows | Classes: %d",
            len(X_train), len(X_test), len(self.le.classes_),
        )

        model = self._build_model()
        logger.info("Fitting %s …", type(model).__name__)
        model.fit(X_train, y_train)

        # Evaluation
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        report_str = classification_report(
            y_test, y_pred, target_names=self.le.classes_, zero_division=0
        )
        logger.info("Test accuracy: %.4f", acc)

        # Cross-validation
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(model, X, y, cv=cv, scoring="accuracy", n_jobs=-1)
        logger.info("CV accuracy: %.4f ± %.4f", cv_scores.mean(), cv_scores.std())

        # Save artefacts
        self._save(model)

        training_report = {
            "model_type": type(model).__name__,
            "n_train": int(len(X_train)),
            "n_test": int(len(X_test)),
            "n_diseases": int(len(self.le.classes_)),
            "n_symptoms": int(len(self.symptom_cols)),
            "test_accuracy": float(round(acc, 4)),
            "cv_mean_accuracy": float(round(cv_scores.mean(), 4)),
            "cv_std_accuracy": float(round(cv_scores.std(), 4)),
            "diseases": self.le.classes_.tolist(),
            "classification_report": report_str,
        }
        save_metadata(training_report, REPORT_PATH)

        logger.info("Model saved → %s", MODEL_PATH)
        return training_report

    # ─── Private helpers ──────────────────────────────────────────────────────

    def _build_model(self):
        rf = RandomForestClassifier(
            n_estimators=300,
            max_depth=None,
            min_samples_split=2,
            min_samples_leaf=1,
            n_jobs=-1,
            random_state=42,
            class_weight="balanced",
        )

        if not HAS_XGB:
            logger.warning("XGBoost not installed — using Random Forest only.")
            return rf

        xgb = XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            use_label_encoder=False,
            eval_metric="mlogloss",
            n_jobs=-1,
            random_state=42,
            verbosity=0,
        )

        ensemble = VotingClassifier(
            estimators=[("rf", rf), ("xgb", xgb)],
            voting="soft",
            n_jobs=-1,
        )
        return ensemble

    def _save(self, model) -> None:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, MODEL_PATH)
        joblib.dump(self.le, LE_PATH)
        with open(SYMS_PATH, "w") as f:
            json.dump(self.symptom_cols, f, indent=2)


# ─── Loader (used by predictor) ───────────────────────────────────────────────

def load_trained_model() -> tuple:
    """
    Returns (model, label_encoder, symptom_list).
    Raises FileNotFoundError if model has not been trained yet.
    """
    for p in (MODEL_PATH, LE_PATH, SYMS_PATH):
        if not p.exists():
            raise FileNotFoundError(
                f"Model artefact missing: {p}\n"
                "Run `python -m src.train_model` or call ModelTrainer.train() first."
            )
    model = joblib.load(MODEL_PATH)
    le = joblib.load(LE_PATH)
    with open(SYMS_PATH) as f:
        symptom_list = json.load(f)
    return model, le, symptom_list
