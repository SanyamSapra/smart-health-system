import logging

from .disease_model import fallback_predict, get_model_health, predict_with_model

logger = logging.getLogger(__name__)


def predict_disease(symptoms: list[str], extra_text: str, clinical_context: dict | None = None) -> dict:
    clinical_context = clinical_context or {}
    model_health = get_model_health()

    if model_health["available"]:
        logger.info("Trained model is available; using trained_model prediction path.")
        return predict_with_model(symptoms, extra_text, clinical_context)

    fallback_reason = model_health.get("message", "Trained model unavailable.")
    logger.error("Trained model unavailable; using fallback rules: %s", fallback_reason)

    fallback = fallback_predict(symptoms)
    top_prediction = fallback[0] if fallback else {}

    return {
        "predictions": fallback,
        "rawPredictions": fallback,
        "source": "fallback_rules",
        "prediction": top_prediction.get("disease", "Unknown"),
        "confidence": top_prediction.get("confidence"),
        "fallbackReason": fallback_reason,
        "contextAnalysis": {
            "riskSignals": [],
            "profile": clinical_context.get("profile") or {},
            "latestVitals": clinical_context.get("latestVitals") or {},
            "symptomDetails": clinical_context.get("symptomDetails") or {},
        },
        "meta": {
            "source": "fallback_rules",
            "fallbackReason": fallback_reason,
            "inputSymptoms": symptoms,
            "clinicalContext": clinical_context,
        },
    }