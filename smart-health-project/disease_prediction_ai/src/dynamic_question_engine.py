"""
dynamic_question_engine.py
==========================
Stage 2 — Dynamic follow-up questioning system.

After Stage 1, we have an initial symptom vector.  This module:

1. Runs the model to get the top-K candidate diseases.
2. Identifies symptoms that are HIGHLY DISCRIMINATIVE between those candidates
   (i.e. symptoms that would change the ranking if answered).
3. Generates 15–30 targeted follow-up questions.
4. Iteratively refines the prediction as answers come in.

Key algorithm
─────────────
  For each pair of top candidate diseases, compute the difference in their
  symptom probability profiles.  Symptoms with the largest absolute difference
  are most useful for separating the candidates → ask those first.

  A symptom "information gain" score is used to rank candidates:
      score(s) = Σ_{d in top_k} P(d) * |P(s|d) - P(s̄|d)|
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import pandas as pd

from src.question_engine import QuestionEngine, QUESTION_TEMPLATES, _auto_question

logger = logging.getLogger("dynamic_question_engine")

MAX_FOLLOWUP = 30
MIN_FOLLOWUP = 15
TOP_K_DISEASES = 5          # Number of candidate diseases to consider
PROBA_THRESHOLD = 0.005     # Ignore symptoms whose overall frequency is <0.5%


@dataclass
class DynamicQuestionEngine:
    """
    Generates Stage-2 dynamic follow-up questions.

    Parameters
    ----------
    model         : Trained sklearn-compatible model with predict_proba.
    label_encoder : Fitted LabelEncoder.
    all_symptoms  : Ordered list of all symptom column names.
    df            : The training DataFrame (for computing P(symptom|disease)).
    question_engine : Stage-1 engine that already holds the initial answers.
    """

    model: object
    label_encoder: object
    all_symptoms: list[str]
    df: pd.DataFrame
    question_engine: QuestionEngine

    _symptom_proba: dict = field(default_factory=dict)   # disease → {symptom: freq}
    _followup_answered: dict = field(default_factory=dict)  # symptom → 0/1

    def __post_init__(self):
        self._build_symptom_profiles()

    # ─── Public API ──────────────────────────────────────────────────────────

    def generate_followup_questions(
        self,
        n: int = MAX_FOLLOWUP,
    ) -> list[dict]:
        """
        Generate up to `n` follow-up questions targeting the top candidate diseases.

        Returns a list of question dicts identical in structure to Stage-1.
        """
        # Current vector from stage-1 answers
        vec = np.array(
            self.question_engine.build_vector(self.all_symptoms), dtype=np.float32
        ).reshape(1, -1)

        proba = self.model.predict_proba(vec)[0]
        top_indices = np.argsort(proba)[::-1][:TOP_K_DISEASES]
        top_diseases = [(self.label_encoder.classes_[i], proba[i]) for i in top_indices]

        logger.info(
            "Top candidates: %s",
            [(d, f"{p:.2%}") for d, p in top_diseases],
        )

        # Compute discriminative score for each unanswered symptom
        already_answered = (
            self.question_engine.get_answered_symptoms() | set(self._followup_answered)
        )
        scored = self._score_discriminative_symptoms(top_diseases, already_answered)

        # Pick top-n
        selected = scored.head(min(n, MAX_FOLLOWUP))

        questions = []
        for rank, (sym, score) in enumerate(selected.items(), 1):
            text = QUESTION_TEMPLATES.get(sym, _auto_question(sym))
            questions.append(
                {
                    "id": f"f{rank}",
                    "symptom": sym,
                    "question": text,
                    "stage": 2,
                    "discriminative_score": float(round(score, 4)),
                }
            )

        logger.info("Generated %d follow-up questions.", len(questions))
        return questions

    def record_followup_answer(self, symptom: str, answer: bool | int) -> None:
        self._followup_answered[symptom] = int(bool(answer))

    def record_followup_answers(self, answers: dict[str, bool | int]) -> None:
        for s, v in answers.items():
            self.record_followup_answer(s, v)

    def get_all_present_symptoms(self) -> list[str]:
        """Combine Stage-1 and Stage-2 present symptoms."""
        stage1 = set(self.question_engine.get_present_symptoms())
        stage2 = {s for s, v in self._followup_answered.items() if v == 1}
        return sorted(stage1 | stage2)

    def build_full_vector(self) -> list[int]:
        """Build the final symptom vector incorporating both stages."""
        combined = {
            **{s: 0 for s in self.all_symptoms},
            **self.question_engine._answers,
            **self._followup_answered,
        }
        return [combined.get(s, 0) for s in self.all_symptoms]

    # ─── Private helpers ──────────────────────────────────────────────────────

    def _build_symptom_profiles(self) -> None:
        """
        Pre-compute P(symptom=1 | disease) for every disease in the dataset.
        """
        symptom_cols = [c for c in self.df.columns if c != "disease"]
        for disease, group in self.df.groupby("disease"):
            self._symptom_proba[disease] = (
                group[symptom_cols].mean().to_dict()
            )

    def _score_discriminative_symptoms(
        self,
        top_diseases: list[tuple],
        exclude: set[str],
    ) -> pd.Series:
        """
        Score each unanswered symptom by how well it discriminates between
        the top candidate diseases.

        score(s) = Σ P(d) * |P(s|d) - mean_other_P(s)|
        """
        symptom_scores: dict[str, float] = {}
        disease_names = [d for d, _ in top_diseases]
        disease_probas = {d: p for d, p in top_diseases}

        for sym in self.all_symptoms:
            if sym in exclude:
                continue

            # Per-disease probability of this symptom
            probs = []
            for disease in disease_names:
                profile = self._symptom_proba.get(disease, {})
                probs.append(profile.get(sym, 0.0))

            # Skip very rare symptoms
            if max(probs) < PROBA_THRESHOLD:
                continue

            # Discriminative score = variance of probs weighted by disease probabilities
            mean_p = np.mean(probs)
            score = sum(
                disease_probas[d] * abs(p - mean_p)
                for d, p in zip(disease_names, probs)
            )
            symptom_scores[sym] = score

        return pd.Series(symptom_scores).sort_values(ascending=False)
