"""
question_engine.py
==================
Stage 1 — Core symptom questionnaire.

Converts the top-20 most important symptoms (from feature importance analysis)
into natural-language yes/no questions and manages the Q&A session.

Usage
-----
    from src.question_engine import QuestionEngine
    engine = QuestionEngine(top_symptoms)
    questions = engine.get_questions()          # list of {id, symptom, question}
    answers   = engine.record_answers(user_answers_dict)
    vector    = engine.build_vector(all_symptoms)
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("question_engine")

# ─── Natural-language question templates ─────────────────────────────────────
# Maps canonical symptom name → human-readable question.
# Unrecognised symptoms get an auto-generated question.

QUESTION_TEMPLATES: dict[str, str] = {
    # Fever / temperature
    "fever":                   "Do you currently have a fever or high temperature?",
    "mild_fever":              "Do you have a mild or low-grade fever?",
    "high_fever":              "Are you experiencing a high fever (above 39 °C / 102 °F)?",
    "chills":                  "Are you experiencing chills or shivering?",
    "sweating":                "Are you sweating more than usual, or having night sweats?",

    # Pain
    "headache":                "Do you have a headache?",
    "severe_headache":         "Are you having a severe or intense headache?",
    "chest_pain":              "Are you experiencing chest pain or tightness?",
    "abdominal_pain":          "Do you have abdominal or stomach pain?",
    "severe_abdominal_pain":   "Is your abdominal pain severe or getting worse?",
    "muscle_pain":             "Are your muscles aching or sore?",
    "joint_pain":              "Are you experiencing pain in your joints?",
    "back_pain":               "Do you have back pain?",
    "body_pain":               "Do you have generalised body pain or aches?",
    "eye_pain":                "Are your eyes painful or aching?",
    "burning_urination":       "Do you feel a burning sensation when urinating?",

    # Respiratory
    "cough":                   "Do you have a cough?",
    "persistent_cough":        "Have you had a persistent cough lasting more than 2 weeks?",
    "breathlessness":          "Are you experiencing shortness of breath or difficulty breathing?",
    "wheezing":                "Do you notice a whistling sound when you breathe?",
    "rapid_breathing":         "Is your breathing faster than normal?",
    "chest_tightness":         "Do you feel tightness in your chest?",
    "blood_in_sputum":         "Have you coughed up blood or blood-stained mucus?",

    # Nose / throat
    "runny_nose":              "Do you have a runny nose?",
    "nasal_congestion":        "Is your nose blocked or stuffy?",
    "sneezing":                "Are you sneezing frequently?",
    "sore_throat":             "Do you have a sore or painful throat?",

    # GI
    "nausea":                  "Are you feeling nauseous?",
    "vomiting":                "Have you been vomiting?",
    "diarrhoea":               "Are you experiencing diarrhoea or loose stools?",
    "loss_of_appetite":        "Have you lost your appetite or interest in eating?",
    "dehydration":             "Do you feel dehydrated (dry mouth, dark urine, thirst)?",
    "abdominal_rigidity":      "Is your abdomen hard or rigid to touch?",

    # Skin
    "skin_rash":               "Have you noticed any skin rash or unusual spots?",
    "itching":                 "Are you experiencing itching on your skin?",
    "blisters":                "Do you have any blisters on your skin?",
    "red_eyes":                "Are your eyes red or irritated?",
    "yellowing_of_skin":       "Has your skin turned yellowish?",
    "yellowing_of_eyes":       "Have the whites of your eyes turned yellow?",
    "pale_skin":               "Does your skin look unusually pale?",
    "rose_spots":              "Have you noticed rose-coloured spots on your abdomen?",
    "koplik_spots":            "Have you noticed tiny white spots inside your mouth?",

    # Neurological / sensory
    "dizziness":               "Are you feeling dizzy or light-headed?",
    "light_sensitivity":       "Are you sensitive to light?",
    "sound_sensitivity":       "Are you sensitive to sound?",
    "blurred_vision":          "Is your vision blurred or unclear?",
    "loss_of_smell":           "Have you lost your sense of smell?",
    "loss_of_taste":           "Have you lost your sense of taste?",

    # Systemic
    "fatigue":                 "Are you feeling unusually tired or exhausted?",
    "weight_loss":             "Have you lost weight recently without trying?",
    "night_sweats":            "Are you waking up drenched in sweat at night?",
    "cold_hands":              "Are your hands or feet unusually cold?",

    # Urinary
    "frequent_urination":      "Are you urinating more often than usual?",
    "increased_thirst":        "Are you feeling excessively thirsty?",
    "cloudy_urine":            "Is your urine cloudy or strong-smelling?",
    "dark_urine":              "Is your urine darker than usual (tea-coloured)?",
    "slow_healing":            "Do cuts or wounds heal slowly?",

    # Musculoskeletal
    "joint_swelling":          "Are any of your joints swollen?",
    "stiffness":               "Do you experience stiffness in your joints, especially in the morning?",
    "redness":                 "Do you have any redness around joints or on the skin?",
    "reduced_range_of_motion": "Is the movement of any joint limited or restricted?",
    "shortness_of_breath":     "Do you feel short of breath during light activities?",
}


def _auto_question(symptom: str) -> str:
    """Generate a generic question from a snake_case symptom name."""
    readable = symptom.replace("_", " ")
    return f"Are you experiencing {readable}?"


@dataclass
class Question:
    symptom: str
    text: str
    stage: int = 1           # 1 = core, 2 = dynamic follow-up


@dataclass
class QuestionEngine:
    """
    Manages Stage-1 core symptom questions.

    Parameters
    ----------
    top_symptoms : list[str]
        Ordered list of top-N symptom names (from feature importance).
    """

    top_symptoms: list[str]
    _answers: dict[str, int] = field(default_factory=dict)   # symptom → 0/1

    # ─── Core interface ───────────────────────────────────────────────────────

    def get_questions(self) -> list[dict]:
        """
        Return the stage-1 questions as a list of dicts:
        {id, symptom, question, stage}
        """
        questions = []
        for i, sym in enumerate(self.top_symptoms, 1):
            text = QUESTION_TEMPLATES.get(sym, _auto_question(sym))
            questions.append(
                {
                    "id": i,
                    "symptom": sym,
                    "question": text,
                    "stage": 1,
                }
            )
        return questions

    def record_answer(self, symptom: str, answer: bool | int) -> None:
        """Record a yes (1) or no (0) answer for a symptom."""
        self._answers[symptom] = int(bool(answer))

    def record_answers(self, answers: dict[str, bool | int]) -> None:
        """Record multiple answers at once. answers = {symptom: 0/1}"""
        for sym, val in answers.items():
            self.record_answer(sym, val)

    def get_present_symptoms(self) -> list[str]:
        """Return symptoms the user answered YES to."""
        return [s for s, v in self._answers.items() if v == 1]

    def get_answered_symptoms(self) -> set[str]:
        """Return all symptom names that have been answered (yes or no)."""
        return set(self._answers.keys())

    def build_vector(self, all_symptoms: list[str]) -> list[int]:
        """
        Convert current answers to a binary list aligned with all_symptoms.
        Returns a list of 0/1 integers.
        """
        return [self._answers.get(s, 0) for s in all_symptoms]

    # ─── Static helper ────────────────────────────────────────────────────────

    @staticmethod
    def symptom_to_question(symptom: str) -> str:
        return QUESTION_TEMPLATES.get(symptom, _auto_question(symptom))
