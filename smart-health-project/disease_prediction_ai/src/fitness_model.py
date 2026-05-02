import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
FILE_PATH = BASE_DIR / "data" / "fitness.csv"

fitness_df = pd.read_csv(FILE_PATH)


def get_workout_plan(goal):
    if not goal:
        return []

    goal = goal.lower().strip()

    filtered = fitness_df[fitness_df["goal"].str.lower() == goal]

    if filtered.empty:
        return fitness_df.sample(3).to_dict(orient="records")

    return filtered.to_dict(orient="records")