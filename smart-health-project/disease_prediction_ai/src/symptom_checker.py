"""
symptom_checker.py
==================
Core orchestrator: loads the trained model and produces disease predictions.

This is the central module that:
  • Loads the model artefacts (model, label encoder, symptom list)
  • Accepts a binary symptom vector or list of symptom names
  • Returns Top-5 disease predictions with probability scores
  • Can also accept manual free-text symptom input

Usage
-----
    from src.symptom_checker import SymptomChecker

    checker = SymptomChecker()

    # Option A — pass a binary vector (from QuestionEngine)
    results = checker.predict_from_vector(vector)

    # Option B — pass a list of symptom names
    results = checker.predict_from_symptoms(["fever", "chills", "headache"])

    # Option C — pass free-text manual input
    results = checker.predict_from_text("fever, body pain, nausea")

    # results → [{"disease": "Malaria", "probability": 0.46}, ...]
"""

import logging
from pathlib import Path
from typing import Optional

import numpy as np

from src.train_model import load_trained_model
from src.utils import (
    build_symptom_vector,
    normalise_symptom,
    parse_manual_input,
    format_predictions,
    MODELS_DIR,
)

logger = logging.getLogger("symptom_checker")

TOP_N = 5       # Number of diseases to return


class SymptomChecker:
    """
    Wraps the trained model and exposes a clean prediction API.
    """

    def __init__(self):
        logger.info("Loading model artefacts …")
        self.model, self.le, self.symptom_list = load_trained_model()
        self._force_single_thread_inference(self.model)
        self.n_symptoms = len(self.symptom_list)
        logger.info(
            "Model loaded: %d diseases | %d symptoms",
            len(self.le.classes_),
            self.n_symptoms,
        )

    def _force_single_thread_inference(self, model) -> None:
        """Disable parallel inference to avoid joblib process/thread permission issues."""
        visited = set()

        def walk(obj):
            obj_id = id(obj)
            if obj_id in visited:
                return
            visited.add(obj_id)

            if hasattr(obj, "n_jobs"):
                try:
                    obj.n_jobs = 1
                except Exception:
                    pass

            for attr in ("estimators_", "estimators"):
                members = getattr(obj, attr, None)
                if not members:
                    continue
                for member in members:
                    if isinstance(member, tuple) and len(member) == 2:
                        walk(member[1])
                    else:
                        walk(member)

            named_steps = getattr(obj, "named_steps", None)
            if isinstance(named_steps, dict):
                for step in named_steps.values():
                    walk(step)

        walk(model)

    # ─── Prediction entry-points ──────────────────────────────────────────────

    def predict_from_vector(
        self,
        vector: list[int] | np.ndarray,
        top_n: int = TOP_N,
    ) -> list[dict]:
        """
        Predict from a pre-built binary symptom vector.

        Parameters
        ----------
        vector : list or np.ndarray, length == len(symptom_list)
        top_n  : number of top diseases to return

        Returns
        -------
        list of {"disease": str, "probability": float, "rank": int}
        """
        vec = np.array(vector, dtype=np.float32).reshape(1, -1)

        if vec.shape[1] != self.n_symptoms:
            raise ValueError(
                f"Vector length {vec.shape[1]} does not match expected {self.n_symptoms}."
            )

        proba = self.model.predict_proba(vec)[0]
        return self._format_output(proba, top_n)

    def predict_from_symptoms(
        self,
        symptoms: list[str],
        top_n: int = TOP_N,
    ) -> list[dict]:
        """
        Predict from a list of symptom names (already normalised or raw).

        Parameters
        ----------
        symptoms : list of symptom name strings
        top_n    : number of top diseases to return
        """
        normalised = [normalise_symptom(s) for s in symptoms]
        vec = build_symptom_vector(normalised, self.symptom_list)
        return self.predict_from_vector(vec, top_n)

    def predict_from_text(
        self,
        text: str,
        top_n: int = TOP_N,
    ) -> list[dict]:
        """
        Predict from a free-text comma-separated symptom string.

        Example input: "fever, body pain, nausea, chills"
        """
        symptoms = parse_manual_input(text)
        logger.info("Parsed manual input: %s", symptoms)
        return self.predict_from_symptoms(symptoms, top_n)

    def predict_combined(
        self,
        vector: list[int] | np.ndarray,
        extra_text: Optional[str] = None,
        top_n: int = TOP_N,
    ) -> list[dict]:
        """
        Predict using a questionnaire vector + optional manual free-text symptoms.
        The manual symptoms are OR'd into the vector.

        Parameters
        ----------
        vector     : binary list from QuestionEngine / DynamicQuestionEngine
        extra_text : comma-separated additional symptoms typed by user
        """
        combined_vec = list(vector)

        if extra_text and extra_text.strip():
            manual = parse_manual_input(extra_text)
            sym_index = {s: i for i, s in enumerate(self.symptom_list)}
            for sym in manual:
                if sym in sym_index:
                    combined_vec[sym_index[sym]] = 1

        return self.predict_from_vector(combined_vec, top_n)

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def _format_output(self, proba: np.ndarray, top_n: int) -> list[dict]:
        top_indices = np.argsort(proba)[::-1][:top_n]
        results = []
        for rank, idx in enumerate(top_indices, 1):
            results.append(
                {
                    "rank": rank,
                    "disease": self.le.classes_[idx],
                    "probability": float(round(proba[idx], 4)),
                    "percentage": f"{proba[idx] * 100:.1f}%",
                }
            )
        return results

    def get_all_diseases(self) -> list[str]:
        return self.le.classes_.tolist()

    def get_symptom_list(self) -> list[str]:
        return self.symptom_list

    def pretty_print(self, predictions: list[dict]) -> None:
        print(format_predictions(predictions))
