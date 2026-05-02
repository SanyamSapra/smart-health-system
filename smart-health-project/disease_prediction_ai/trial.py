# ...existing code...

def ok(data: dict | list, status: int = 200):
    return jsonify(data), status


def err(message: str, status: int = 400):
    return jsonify({"error": message}), status


RECOMMENDATIONS = {
    "diabetes": {
        "diet": "Reduce sugar and refined carbs, prioritise whole grains, vegetables, lean protein and healthy fats.",
        "exercise": "Aim for 30 minutes of moderate cardio most days and add resistance training twice a week."
    },
    "hypertension": {
        "diet": "Follow a DASH-style diet with low sodium, plenty of fruits, vegetables, and whole grains.",
        "exercise": "Try brisk walking, cycling, or swimming for 30 minutes most days."
    },
    "migraine": {
        "diet": "Stay hydrated, avoid trigger foods like aged cheese and processed meats, and eat regular balanced meals.",
        "exercise": "Gentle aerobic exercise such as walking, yoga, or stretching can help reduce stress."
    },
    "asthma": {
        "diet": "Eat a diet rich in fruits, vegetables, lean protein and omega-3 fatty acids; avoid known food triggers.",
        "exercise": "Low-impact activities like walking, swimming and cycling can improve lung health."
    },
    "common cold": {
        "diet": "Focus on hydration, warm broths, fruits and vegetables rich in vitamin C.",
        "exercise": "Rest when needed; gentle movement such as light stretching may help if symptoms are mild."
    },
    "covid-19": {
        "diet": "Stay hydrated, eat nutrient-rich foods, and prioritise protein, fruits and vegetables.",
        "exercise": "Rest and recuperate first; return gradually to light activity as symptoms subside."
    },
    "arthritis": {
        "diet": "Choose anti-inflammatory foods like omega-3 rich fish, fruits, vegetables and whole grains.",
        "exercise": "Low-impact exercise such as swimming, walking, and gentle stretching can reduce stiffness."
    },
    "heart disease": {
        "diet": "Use a heart-healthy diet with vegetables, whole grains, lean protein, and low saturated fat.",
        "exercise": "Aim for moderate aerobic activity like brisk walking for 150 minutes per week."
    },
    "anemia": {
        "diet": "Eat iron-rich foods, vitamin C sources to aid absorption, and lean protein.",
        "exercise": "Light aerobic exercise is best until energy improves; avoid over-exertion."
    },
    "gastritis": {
        "diet": "Avoid spicy, acidic, and fried foods; eat smaller, more frequent meals.",
        "exercise": "Gentle activities such as walking or yoga can support digestion without irritation."
    },
    "generic": {
        "diet": "Maintain a balanced diet with whole foods, lean protein, vegetables and adequate hydration.",
        "exercise": "Stay active with regular moderate exercise and avoid long periods of inactivity."
    },
}


def _normalise_disease_name(name: str) -> str:
    return name.strip().lower()


def recommend_for_disease(disease_name: str) -> dict[str, str]:
    return RECOMMENDATIONS.get(_normalise_disease_name(disease_name), RECOMMENDATIONS["generic"])


def build_recommendations(predictions: list[dict]) -> list[dict]:
    recommendations = []
    for prediction in predictions:
        disease = prediction.get("disease") or prediction.get("name") or ""
        rec = recommend_for_disease(disease)
        recommendations.append({
            "disease": disease,
            "diet": rec["diet"],
            "exercise": rec["exercise"],
        })
    return recommendations


# ...existing code...

@app.post("/api/predict/text")
def predict_text():
    # ...existing code...
    try:
        checker = get_checker()
        results = checker.predict_from_text(text, top_n=top_n)
        parsed = parse_manual_input(text)
        return ok({
            "input_symptoms": parsed,
            "predictions": results,
            "recommendations": build_recommendations(results),
        })
    except Exception as e:
        logger.exception("predict_text error")
        return err(str(e), 500)


@app.post("/api/predict/symptoms")
def predict_symptoms():
    # ...existing code...
    try:
        checker = get_checker()
        results = checker.predict_from_symptoms(raw, top_n=top_n)
        return ok({
            "predictions": results,
            "recommendations": build_recommendations(results),
        })
    except Exception as e:
        logger.exception("predict_symptoms error")
        return err(str(e), 500)


@app.post("/api/predict/vector")
def predict_vector():
    # ...existing code...
    try:
        checker = get_checker()
        results = checker.predict_combined(vector, extra_text=extra, top_n=top_n)
        return ok({
            "predictions": results,
            "recommendations": build_recommendations(results),
        })
    except Exception as e:
        logger.exception("predict_vector error")
        return err(str(e), 500)


@app.post("/api/session/answer")
def session_answer():
    # ...existing code...
    try:
        checker = get_checker()
        top_symptoms = get_top_symptoms()

        engine = QuestionEngine(top_symptoms)
        engine.record_answers(stage1)
        engine.record_answers(stage2)

        vector = engine.build_vector(checker.get_symptom_list())
        results = checker.predict_combined(vector, extra_text=extra, top_n=top_n)
        present = engine.get_present_symptoms()

        return ok({
            "present_symptoms": present,
            "predictions": results,
            "recommendations": build_recommendations(results),
        })
    except Exception as e:
        logger.exception("session_answer error")
        return err(str(e), 500)