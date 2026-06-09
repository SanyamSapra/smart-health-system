import json
import sys
from functools import lru_cache
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_APP_ROOT = PROJECT_ROOT / "disease_prediction_ai"

if str(MODEL_APP_ROOT) not in sys.path:
    sys.path.insert(0, str(MODEL_APP_ROOT))

from src.symptom_checker import SymptomChecker
from src.train_model import REPORT_PATH
from src.utils import build_symptom_vector, normalise_symptom, parse_manual_input


DASHBOARD_SYMPTOM_MAP = {
    "fever": ["highfever", "mildfever"],
    "weakness": ["muscleweakness", "weaknessinlimbs"],
    "weight_loss": ["weightloss"],
    "loss_of_appetite": ["lossofappetite"],
    "blurred_vision": ["blurredanddistortedvision"],
    "chest_pain": ["chestpain"],
    "shortness_of_breath": ["breathlessness"],
    "sore_throat": ["throatirritation", "patchesinthroat"],
    "throat_irritation": ["throatirritation"],
    "runny_nose": ["runnynose"],
    "abdominal_pain": ["abdominalpain"],
    "belly_pain": ["abdominalpain", "bellypain"],
    "bellypain": ["abdominalpain", "bellypain"],
    "diarrhea": ["diarrhoea"],
    "muscle_pain": ["musclepain"],
    "muscle_weakness": ["muscleweakness"],
    "joint_pain": ["jointpain"],
    "back_pain": ["backpain"],
    "skin_rash": ["skinrash"],
    "yellowing_skin": ["yellowishskin", "yellowingofeyes"],
    "swollen_lymph_nodes": ["swelledlymphnodes"],
    "frequent_urination": ["continuousfeelofurine"],
}


DISEASE_MAP = {
    "fever": ["Malaria", "Typhoid Fever", "Dengue Fever", "Influenza", "COVID-19"],
    "mildfever": ["Influenza", "Viral Infection", "Common Cold", "Dengue Fever", "Malaria"],
    "highfever": ["Dengue Fever", "Malaria", "Typhoid Fever", "Pneumonia", "COVID-19"],
    "chills": ["Malaria", "Dengue Fever", "Influenza", "Typhoid Fever", "Pneumonia"],
    "chest_pain": ["Myocardial Infarction", "Angina Pectoris", "Pneumonia", "GERD", "Pulmonary Embolism"],
    "chestpain": ["Myocardial Infarction", "Angina Pectoris", "Pneumonia", "GERD", "Pulmonary Embolism"],
    "weight_loss": ["Tuberculosis", "Type 2 Diabetes", "Hyperthyroidism", "Celiac Disease", "Lymphoma"],
    "weightloss": ["Tuberculosis", "Type 2 Diabetes", "Hyperthyroidism", "Celiac Disease", "Lymphoma"],
    "joint_pain": ["Rheumatoid Arthritis", "Osteoarthritis", "Gout", "Lupus", "Lyme Disease"],
    "jointpain": ["Rheumatoid Arthritis", "Osteoarthritis", "Gout", "Lupus", "Lyme Disease"],
    "skin_rash": ["Psoriasis", "Eczema", "Chickenpox", "Measles", "Allergic Reaction"],
    "skinrash": ["Psoriasis", "Eczema", "Chickenpox", "Measles", "Allergic Reaction"],
    "frequent_urination": ["Type 2 Diabetes", "Type 1 Diabetes", "Urinary Tract Infection", "Diabetes Insipidus", "Prostatitis"],
    "continuousfeelofurine": ["Type 2 Diabetes", "Type 1 Diabetes", "Urinary Tract Infection", "Diabetes Insipidus", "Prostatitis"],
    "cough": ["Tuberculosis", "COVID-19", "Bronchitis", "Pneumonia", "Asthma"],
    "headache": ["Migraine", "Tension Headache", "Hypertension", "Meningitis", "Sinusitis"],
    "fatigue": ["Anemia", "Hypothyroidism", "Chronic Fatigue Syndrome", "Depression", "Sleep Apnea"],
    "shortness_of_breath": ["Asthma", "Heart Failure", "Pulmonary Embolism", "COPD", "Anemia"],
    "breathlessness": ["Asthma", "Heart Failure", "Pulmonary Embolism", "COPD", "Anemia"],
    "nausea": ["Gastroenteritis", "Food Poisoning", "Peptic Ulcer", "Appendicitis", "Migraine"],
    "vomiting": ["Gastroenteritis", "Food Poisoning", "Peptic Ulcer", "Appendicitis", "Migraine"],
    "abdominal_pain": ["Appendicitis", "Irritable Bowel Syndrome", "Peptic Ulcer", "Crohn's Disease", "Gallstones"],
    "abdominalpain": ["Appendicitis", "Irritable Bowel Syndrome", "Peptic Ulcer", "Crohn's Disease", "Gallstones"],
    "diarrhoea": ["Gastroenteritis", "Food Poisoning", "Cholera", "Irritable Bowel Syndrome", "Typhoid Fever"],
    "muscle_pain": ["Fibromyalgia", "Viral Infection", "Dengue Fever", "Lyme Disease", "Polymyositis"],
    "musclepain": ["Fibromyalgia", "Viral Infection", "Dengue Fever", "Lyme Disease", "Polymyositis"],
    "yellowing_skin": ["Hepatitis A", "Hepatitis B", "Jaundice", "Cirrhosis", "Gallstones"],
    "yellowishskin": ["Hepatitis A", "Hepatitis B", "Jaundice", "Cirrhosis", "Gallstones"],
    "excessive_thirst": ["Type 1 Diabetes", "Type 2 Diabetes", "Diabetes Insipidus", "Dehydration", "Hypercalcemia"],
    "irregularsugarlevel": ["Type 1 Diabetes", "Type 2 Diabetes", "Diabetes Insipidus", "Dehydration", "Hypercalcemia"],
}


def _unique(items: list[str]) -> list[str]:
    seen = set()
    result = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _compact_symptom_key(symptom: str) -> str:
    return normalise_symptom(symptom).replace("_", "")


@lru_cache(maxsize=1)
def get_checker() -> SymptomChecker:
    return SymptomChecker()


@lru_cache(maxsize=1)
def get_training_report() -> dict:
    if REPORT_PATH.exists():
        return json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    return {}


def get_model_health() -> dict:
    try:
        checker = get_checker()
        report = get_training_report()
        return {
            "available": True,
            "source": "trained_model",
            "diseases": len(checker.get_all_diseases()),
            "symptoms": len(checker.get_symptom_list()),
            "modelType": report.get("model_type"),
            "testAccuracy": report.get("test_accuracy"),
        }
    except Exception as exc:
        return {
            "available": False,
            "source": "fallback_rules",
            "message": str(exc),
        }


def _resolve_symptom_candidates(raw_symptom: str) -> list[str]:
    raw = raw_symptom.strip().lower()
    normalized = normalise_symptom(raw)
    compact_raw = raw.replace("_", "").replace(" ", "")
    compact_normalized = normalized.replace("_", "")

    return _unique(
        DASHBOARD_SYMPTOM_MAP.get(raw, [])
        + DASHBOARD_SYMPTOM_MAP.get(normalized, [])
        + [
            raw,
            normalized,
            compact_raw,
            compact_normalized,
            raw.replace("_", " "),
            normalized.replace("_", " "),
        ]
    )


def resolve_symptoms(symptoms: list[str], extra_text: str = "") -> dict:
    checker = get_checker()
    model_symptoms = set(checker.get_symptom_list())

    selected_inputs = _unique([s for s in symptoms if isinstance(s, str) and s.strip()])
    extra_inputs = parse_manual_input(extra_text) if extra_text.strip() else []
    all_inputs = _unique(selected_inputs + extra_inputs)

    matched_inputs = []
    approximated_inputs = {}
    unmatched_inputs = []
    model_tokens = []

    for raw_symptom in all_inputs:
        candidates = _resolve_symptom_candidates(raw_symptom)
        matches = [candidate for candidate in candidates if candidate in model_symptoms]
        if matches:
            model_tokens.extend(matches)
            if raw_symptom in matches:
                matched_inputs.append(raw_symptom)
            else:
                approximated_inputs[raw_symptom] = matches
        else:
            unmatched_inputs.append(raw_symptom)

    return {
        "inputSymptoms": all_inputs,
        "modelSymptoms": _unique(model_tokens),
        "matchedSymptoms": matched_inputs,
        "approximatedSymptoms": approximated_inputs,
        "unmatchedSymptoms": unmatched_inputs,
    }


def fallback_predict(symptoms: list[str]) -> list[dict]:
    normalized = _unique(
        [normalise_symptom(symptom) for symptom in symptoms]
        + [_compact_symptom_key(symptom) for symptom in symptoms]
    )
    scores: dict[str, int] = {}

    for symptom in normalized:
        for index, disease in enumerate(DISEASE_MAP.get(symptom, [])):
            scores[disease] = scores.get(disease, 0) + max(20, 85 - index * 11)

    if not scores:
        return [
            {
                "disease": "Unknown",
                "confidence": 5,
                "probability": 0.05,
                "rank": 1,
                "percentage": "5%",
                "message": "No recognized symptoms were matched. Please select symptoms from the list or try common symptom names.",
            }
        ]

    max_score = max(scores.values())
    predictions = [
        {
            "disease": disease,
            "confidence": min(97, max(10, round((score / max_score) * 90))),
        }
        for disease, score in scores.items()
    ]

    return sorted(predictions, key=lambda item: item["confidence"], reverse=True)[:5]


def _add_context_symptom(symptoms: list[str], symptom: str, reason: str, reasons: list[dict]) -> None:
    if symptom not in symptoms:
        symptoms.append(symptom)
    reasons.append({"symptom": symptom, "reason": reason})


def derive_context_symptoms(clinical_context: dict) -> tuple[list[str], list[dict]]:
    """
    Convert compatible profile/vital context into model symptom tokens.
    The current trained model is symptom-only, so non-symptom fields are used
    conservatively as extra signals and separately reported in metadata.
    """
    symptoms: list[str] = []
    reasons: list[dict] = []
    profile = clinical_context.get("profile") or {}
    vitals = clinical_context.get("latestVitals") or {}

    bmi = vitals.get("bmi")
    sugar = vitals.get("sugarLevel")
    systolic = vitals.get("systolicBP")
    diastolic = vitals.get("diastolicBP")

    if isinstance(bmi, (int, float)) and bmi >= 30:
        _add_context_symptom(symptoms, "obesity", f"BMI is {bmi}", reasons)

    if isinstance(sugar, (int, float)) and sugar >= 126:
        _add_context_symptom(symptoms, "irregularsugarlevel", f"Sugar level is {sugar} mg/dL", reasons)

    if isinstance(systolic, (int, float)) and systolic >= 140:
        _add_context_symptom(symptoms, "headache", f"Systolic BP is {systolic}", reasons)
        _add_context_symptom(symptoms, "dizziness", f"Systolic BP is {systolic}", reasons)
    elif isinstance(diastolic, (int, float)) and diastolic >= 90:
        _add_context_symptom(symptoms, "headache", f"Diastolic BP is {diastolic}", reasons)

    if profile.get("alcohol"):
        _add_context_symptom(symptoms, "historyofalcoholconsumption", "Alcohol use is listed in profile", reasons)

    for condition in profile.get("medicalConditions") or []:
        normalized = normalise_symptom(str(condition))
        if "diabetes" in normalized:
            _add_context_symptom(symptoms, "irregularsugarlevel", "Diabetes is listed in medical conditions", reasons)
        if "asthma" in normalized:
            _add_context_symptom(symptoms, "breathlessness", "Asthma is listed in medical conditions", reasons)
        if "hypertension" in normalized or "bloodpressure" in normalized:
            _add_context_symptom(symptoms, "headache", "Hypertension is listed in medical conditions", reasons)

    return _unique(symptoms), reasons


def assess_context_risks(clinical_context: dict) -> list[dict]:
    profile = clinical_context.get("profile") or {}
    vitals = clinical_context.get("latestVitals") or {}
    details = clinical_context.get("symptomDetails") or {}
    risks: list[dict] = []

    systolic = vitals.get("systolicBP")
    diastolic = vitals.get("diastolicBP")
    sugar = vitals.get("sugarLevel")
    bmi = vitals.get("bmi")
    age = profile.get("age")
    severity = str(details.get("severity") or "").lower()

    if isinstance(systolic, (int, float)) and systolic >= 160:
        risks.append({"level": "high", "message": f"Latest systolic BP is very high ({systolic})."})
    elif isinstance(systolic, (int, float)) and systolic >= 140:
        risks.append({"level": "moderate", "message": f"Latest systolic BP is high ({systolic})."})

    if isinstance(diastolic, (int, float)) and diastolic >= 100:
        risks.append({"level": "high", "message": f"Latest diastolic BP is very high ({diastolic})."})
    elif isinstance(diastolic, (int, float)) and diastolic >= 90:
        risks.append({"level": "moderate", "message": f"Latest diastolic BP is high ({diastolic})."})

    if isinstance(sugar, (int, float)) and sugar >= 200:
        risks.append({"level": "high", "message": f"Latest sugar level is high ({sugar} mg/dL)."})
    elif isinstance(sugar, (int, float)) and sugar >= 126:
        risks.append({"level": "moderate", "message": f"Latest sugar level is above ideal range ({sugar} mg/dL)."})

    if isinstance(bmi, (int, float)) and (bmi < 18.5 or bmi >= 30):
        risks.append({"level": "moderate", "message": f"BMI context may affect risk interpretation ({bmi})."})

    if isinstance(age, (int, float)) and age >= 60:
        risks.append({"level": "moderate", "message": "Age is 60+, so persistent symptoms may need earlier review."})

    if severity == "severe":
        risks.append({"level": "high", "message": "Symptoms were marked severe."})

    return risks


def _format_model_predictions(raw_predictions: list[dict]) -> list[dict]:
    formatted = []
    for item in raw_predictions:
        confidence = round(float(item["probability"]) * 100, 1)
        formatted.append(
            {
                "disease": item["disease"],
                "confidence": confidence,
                "probability": item["probability"],
                "rank": item.get("rank"),
                "percentage": item.get("percentage"),
            }
        )
    return formatted


def _blend_with_clinical_prior(model_predictions: list[dict], prior_predictions: list[dict]) -> list[dict]:
    scores: dict[str, dict] = {}

    for item in model_predictions:
        disease = item["disease"]
        scores[disease] = {
            **item,
            "confidence": float(item["confidence"]),
            "_score": float(item["confidence"]),
        }

    for item in prior_predictions:
        disease = item["disease"]
        current = scores.get(disease, {"disease": disease, "_score": 0})
        current["_score"] = current.get("_score", 0) + float(item["confidence"]) * 0.65
        current["confidence"] = max(float(current.get("confidence", 0)), float(item["confidence"]) * 0.65)
        scores[disease] = current

    blended = sorted(scores.values(), key=lambda item: item["_score"], reverse=True)[:5]
    for rank, item in enumerate(blended, 1):
        confidence = round(min(98, max(1, item["_score"])), 1)
        item["rank"] = rank
        item["confidence"] = confidence
        item["probability"] = round(confidence / 100, 4)
        item["percentage"] = f"{confidence:.1f}%"
        item.pop("_score", None)

    return blended


def predict_with_model(
    symptoms: list[str],
    extra_text: str = "",
    clinical_context: dict | None = None,
    top_n: int = 5,
) -> dict:
    checker = get_checker()
    clinical_context = clinical_context or {}
    context_symptoms, context_reasons = derive_context_symptoms(clinical_context)
    combined_symptoms = _unique(symptoms + context_symptoms)
    resolution = resolve_symptoms(combined_symptoms, extra_text)

    if not resolution["modelSymptoms"]:
        raise ValueError("No compatible symptoms could be mapped to the trained model.")

    vector = build_symptom_vector(resolution["modelSymptoms"], checker.get_symptom_list())
    raw_predictions = checker.predict_from_vector(vector, top_n=top_n)
    model_predictions = _format_model_predictions(raw_predictions)
    prior_predictions = fallback_predict(resolution["inputSymptoms"])
    predictions = _blend_with_clinical_prior(model_predictions, prior_predictions)

    return {
        "predictions": predictions,
        "rawPredictions": raw_predictions,
        "meta": {
            **resolution,
            "source": "trained_model",
            "rankingStrategy": "trained_model_with_clinical_prior",
            "userSelectedSymptoms": symptoms,
            "contextDerivedSymptoms": context_symptoms,
            "contextDerivedReasons": context_reasons,
            "contextRiskSignals": assess_context_risks(clinical_context),
            "clinicalContext": clinical_context,
        },
    }
