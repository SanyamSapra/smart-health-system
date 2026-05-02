import json
import sys

from py_backend.predictor import predict_disease


def main():
    payload = json.loads(sys.argv[1])
    symptoms = payload.get("symptoms", [])
    extra_text = payload.get("extra_text", "")
    result = predict_disease(symptoms, extra_text)
    print(json.dumps(result["predictions"]))


if __name__ == "__main__":
    main()
