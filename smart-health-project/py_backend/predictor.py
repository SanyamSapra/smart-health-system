from .disease_model import fallback_predict, get_model_health, predict_with_model, resolve_symptoms


def _safe_resolve_symptoms(symptoms: list[str], extra_text: str) -> dict:
    try:
        return resolve_symptoms(symptoms, extra_text)
    except Exception:
        return {
            "inputSymptoms": symptoms,
            "modelSymptoms": [],
            "matchedSymptoms": [],
            "approximatedSymptoms": {},
            "unmatchedSymptoms": symptoms,
        }


def predict_disease(symptoms: list[str], extra_text: str, clinical_context: dict | None = None) -> dict:
    clinical_context = clinical_context or {}
    model_health = get_model_health()
    if model_health["available"]:
        try:
            return predict_with_model(symptoms, extra_text, clinical_context)
        except Exception as exc:
            resolution = _safe_resolve_symptoms(symptoms, extra_text)
            fallback = fallback_predict(resolution["modelSymptoms"] or symptoms)
            return {
                "predictions": fallback,
                "rawPredictions": fallback,
                "meta": {
                    "source": "fallback_rules",
                    "fallbackReason": str(exc),
                    **resolution,
                    "clinicalContext": clinical_context,
                },
            }

    resolution = _safe_resolve_symptoms(symptoms, extra_text)
    fallback = fallback_predict(resolution["modelSymptoms"] or symptoms)
    return {
        "predictions": fallback,
        "rawPredictions": fallback,
        "meta": {
            "source": "fallback_rules",
            "fallbackReason": model_health.get("message", "Trained model unavailable."),
            **resolution,
            "clinicalContext": clinical_context,
        },
    }
