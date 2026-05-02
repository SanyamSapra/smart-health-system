import sys
from pathlib import Path

# Allow imports from the project root directory
sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.symptom_checker import SymptomChecker
from src.question_engine import QuestionEngine
from src.dynamic_question_engine import DynamicQuestionEngine
from src.utils import format_predictions, MODELS_DIR, DATASET_DIR
from src.analyze_dataset import DatasetAnalyzer
import pandas as pd
import json


def print_banner():
    """Display the program title when the application starts."""
    print("\n" + "=" * 58)
    print("      AI Disease Prediction System - Interactive Demo")
    print("=" * 58)


def run_questionnaire_demo(checker: SymptomChecker):
    """
    Runs the full interactive questionnaire.

    The process consists of two stages:
    Stage 1: Core symptom questions
    Stage 2: Dynamically generated follow-up questions based on Stage 1 answers
    """

    # Load the dataset analysis report to identify the most important symptoms
    analysis_path = MODELS_DIR / "dataset_analysis.json"

    if analysis_path.exists():
        with open(analysis_path) as f:
            report = json.load(f)
        top_symptoms = report["top_20_symptoms_by_importance"]
    else:
        # Fallback in case the analysis file is not available
        top_symptoms = checker.get_symptom_list()[:20]

    engine = QuestionEngine(top_symptoms)

    print("\n--- STAGE 1: Core Symptom Questions ---")
    print("Please answer each question with yes (y) or no (n).\n")

    questions = engine.get_questions()

    for q in questions:
        while True:
            ans = input(f"  {q['id']:>2}. {q['question']} [y/n]: ").strip().lower()

            if ans in ("y", "yes", "1"):
                engine.record_answer(q["symptom"], 1)
                break

            elif ans in ("n", "no", "0"):
                engine.record_answer(q["symptom"], 0)
                break

            print("  Invalid input. Please enter 'y' or 'n'.")

    # Generate initial prediction using Stage 1 responses
    vector = engine.build_vector(checker.get_symptom_list())
    initial_preds = checker.predict_from_vector(vector)

    print("\nPreliminary prediction based on Stage 1 answers:")
    checker.pretty_print(initial_preds)

    # Ask the user whether they want to continue to Stage 2
    do_stage2 = input("\nWould you like to continue with follow-up questions? [y/n]: ").strip().lower()

    if do_stage2 not in ("y", "yes"):
        return initial_preds

    # Load the training dataset required for generating follow-up questions
    unified_csv = DATASET_DIR / "unified_dataset.csv"

    if not unified_csv.exists():
        print("Training dataset not found. Stage 2 questions cannot be generated.")
        return initial_preds

    df = pd.read_csv(unified_csv, low_memory=False)

    # Initialize the dynamic question engine
    dqe = DynamicQuestionEngine(
        model=checker.model,
        label_encoder=checker.le,
        all_symptoms=checker.get_symptom_list(),
        df=df,
        question_engine=engine,
    )

    print("\n--- STAGE 2: Follow-up Questions ---")

    followup_qs = dqe.generate_followup_questions(n=20)

    for q in followup_qs:
        while True:
            ans = input(f"  {q['id']:>3}. {q['question']} [y/n]: ").strip().lower()

            if ans in ("y", "yes", "1"):
                dqe.record_followup_answer(q["symptom"], 1)
                break

            elif ans in ("n", "no", "0"):
                dqe.record_followup_answer(q["symptom"], 0)
                break

            print("  Invalid input. Please enter 'y' or 'n'.")

    # Allow the user to manually add any additional symptoms
    print("\n--- Additional Symptom Input ---")

    extra = input(
        "Enter any additional symptoms separated by commas (or press Enter to skip): "
    ).strip()

    # Combine all answers into the final symptom vector
    full_vector = dqe.build_full_vector()

    # Generate the final prediction
    final_preds = checker.predict_combined(full_vector, extra_text=extra)

    print("\nFinal prediction based on all provided information:")
    checker.pretty_print(final_preds)

    return final_preds


def run_quick_demo(checker: SymptomChecker):
    """
    Runs a quick demonstration using predefined symptoms.
    This mode is useful for testing the prediction system quickly.
    """

    print("\n--- Quick Demo: Predefined Symptoms ---")

    symptoms = [
        "fever",
        "chills",
        "sweating",
        "headache",
        "nausea",
        "muscle_pain"
    ]

    print(f"Input symptoms: {', '.join(symptoms)}\n")

    results = checker.predict_from_symptoms(symptoms)
    checker.pretty_print(results)

    print("\n--- Quick Demo: Manual Text Input ---")

    text = "persistent cough, blood in sputum, weight loss, night sweats"

    print(f'Input text: "{text}"\n')

    results2 = checker.predict_from_text(text)
    checker.pretty_print(results2)


def main():
    """Main entry point for the application."""

    print_banner()

    print("\nLoading the trained model...")

    try:
        checker = SymptomChecker()

        print(
            f"Model loaded successfully. "
            f"{len(checker.get_all_diseases())} diseases and "
            f"{len(checker.get_symptom_list())} symptoms available."
        )

    except FileNotFoundError:
        print("\nModel not found.")
        print("Please run the training pipeline first using:")
        print("python run_pipeline.py\n")
        sys.exit(1)

    print("\nSelect a demo mode:")
    print("1. Full interactive questionnaire (Stage 1 + Stage 2)")
    print("2. Quick demo using predefined symptoms")

    while True:
        choice = input("\nEnter your choice [1/2]: ").strip()

        if choice == "1":
            run_questionnaire_demo(checker)
            break

        elif choice == "2":
            run_quick_demo(checker)
            break

        print("Invalid choice. Please enter 1 or 2.")

    print("\n" + "=" * 58)
    print("Disclaimer: This system is for educational purposes only.")
    print("Always consult a qualified medical professional for diagnosis.")
    print("=" * 58 + "\n")


if __name__ == "__main__":
    main()