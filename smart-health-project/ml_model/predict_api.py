import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from py_backend.predictor import predict_disease


def main():
    payload = json.loads(sys.argv[1])
    symptoms = payload.get("symptoms", [])
    extra_text = payload.get("extra_text", "")
    clinical_context = payload.get("clinical_context") or {}
    result = predict_disease(symptoms, extra_text, clinical_context)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
