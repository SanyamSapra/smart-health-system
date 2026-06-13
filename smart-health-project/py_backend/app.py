import os
import time
import logging
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS

from .disease_model import get_model_health
from .predictor import predict_disease


START_TIME = time.time()
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config["PORT"] = int(os.getenv("PORT", "5050"))
app.config["JSON_SORT_KEYS"] = False

client_origins = [
    "http://localhost:5173",
    *[
        origin.strip()
        for origin in os.getenv("CLIENT_URL", "").split(",")
        if origin.strip()
    ],
]

CORS(
    app,
    supports_credentials=True,
    origins=client_origins,
)


@app.get("/")
def root():
    return jsonify({"success": True, "message": "Disease prediction API is running"})


@app.get("/api/health")
def health():
    model_health = get_model_health()
    return jsonify(
        {
            "success": True,
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "uptime": time.time() - START_TIME,
            "predictionModel": model_health,
        }
    )


@app.post("/api/disease/predict")
def predict():
    payload = request.get_json(silent=True) or {}
    symptoms = payload.get("symptoms") or []
    extra_text = payload.get("extra_text", "")
    clinical_context = payload.get("clinical_context") or {}

    if not isinstance(symptoms, list):
        return jsonify({"success": False, "message": "Symptoms must be a list."}), 400

    if not isinstance(clinical_context, dict):
        return jsonify({"success": False, "message": "Clinical context must be an object."}), 400

    if not symptoms and not extra_text.strip():
        return jsonify({"success": False, "message": "At least one symptom is required."}), 400

    try:
        prediction_result = predict_disease(symptoms, extra_text, clinical_context)
    except ValueError as error:
        logger.warning("Disease prediction rejected: %s", error)
        return jsonify(
            {
                "success": False,
                "message": str(error),
                "source": "trained_model",
                "fallbackReason": None,
            }
        ), 422
    except Exception as error:
        logger.exception("Trained disease prediction failed.")
        return jsonify(
            {
                "success": False,
                "message": "Trained disease prediction model failed.",
                "details": str(error),
                "source": "trained_model",
                "fallbackReason": None,
            }
        ), 502

    predictions = prediction_result["predictions"]
    top_disease = predictions[0]["disease"] if predictions else "Unknown"

    return jsonify(
        {
            "success": True,
            "source": prediction_result["source"],
            "prediction": prediction_result["prediction"],
            "confidence": prediction_result["confidence"],
            "fallbackReason": prediction_result["fallbackReason"],
            "contextAnalysis": prediction_result["contextAnalysis"],
            "predictions": predictions,
            "rawPredictions": prediction_result["rawPredictions"],
            "topDisease": top_disease,
            "symptoms": symptoms,
            "predictionMeta": prediction_result["meta"],
            "patientContext": clinical_context,
        }
    )


@app.errorhandler(Exception)
def handle_error(error):
    if hasattr(error, "code") and hasattr(error, "description"):
        return jsonify({"success": False, "message": error.description}), error.code
    return jsonify({"success": False, "message": str(error) or "Internal server error"}), 500
