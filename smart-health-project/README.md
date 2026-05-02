# Smart Health Disease Prediction Service

This repository has been streamlined to contain only the disease prediction model, its training utilities, and a minimal Flask API for inference.

## What remains

- `py_backend/` — minimal Flask service exposing disease prediction endpoints
- `disease_prediction_ai/` — model training, symptom normalization, and prediction code
- `main.py` — application entrypoint
- `requirements.txt` — trimmed dependency list
- `ml_model/predict_api.py` — optional CLI wrapper for running prediction from JSON input

## What was removed

- React frontend assets
- auth/login/user profile management
- MongoDB persistence and history tracking
- recommendation generation and Gemini/GROQ integration
- unused legacy project scripts and empty root folders

## Run the API

1. Install dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Start the API:

```bash
python main.py
```

3. Call prediction:

```bash
curl -X POST http://localhost:5050/api/disease/predict \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["fever", "headache"], "extra_text": "nausea"}'
```

The integrated Node backend expects this service at `http://localhost:5050`.
Run with the default `python main.py`, or set `DISEASE_API_URL` in the Node backend if you use a different port.

## Training the model

The disease model training code lives in `disease_prediction_ai/src/train_model.py`.

- `disease_prediction_ai/run_pipeline.py` runs the full training pipeline
- model artifacts are saved under `disease_prediction_ai/models/`

If you need to retrain, run:

```bash
cd disease_prediction_ai
python run_pipeline.py
```
