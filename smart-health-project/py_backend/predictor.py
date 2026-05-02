from .disease_model import fallback_predict, get_model_health, predict_with_model


def predict_disease(symptoms: list[str], extra_text: str, clinical_context: dict | None = None) -> dict:
    clinical_context = clinical_context or {}
    model_health = get_model_health()
    if model_health["available"]:
        try:
            return predict_with_model(symptoms, extra_text, clinical_context)
        except Exception as exc:
            fallback = fallback_predict(symptoms)
            return {
                "predictions": fallback,
                "rawPredictions": fallback,
                "meta": {
                    "source": "fallback_rules",
                    "fallbackReason": str(exc),
                    "inputSymptoms": symptoms,
                    "clinicalContext": clinical_context,
                    "modelSymptoms": [],
                    "matchedSymptoms": [],
                    "approximatedSymptoms": {},
                    "unmatchedSymptoms": [],
                },
            }

    fallback = fallback_predict(symptoms)
    return {
        "predictions": fallback,
        "rawPredictions": fallback,
        "meta": {
            "source": "fallback_rules",
            "fallbackReason": model_health.get("message", "Trained model unavailable."),
            "inputSymptoms": symptoms,
            "clinicalContext": clinical_context,
            "modelSymptoms": [],
            "matchedSymptoms": [],
            "approximatedSymptoms": {},
            "unmatchedSymptoms": [],
        },
    }
