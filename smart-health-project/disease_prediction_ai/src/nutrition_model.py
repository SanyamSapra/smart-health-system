import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
FILE_PATH = BASE_DIR / "data" / "nutrition.csv"

nutrition_df = pd.read_csv(FILE_PATH)


def get_food_recommendations(goal):
    if not goal:
        return []

    goal = goal.lower().strip()

    filtered = nutrition_df[nutrition_df["goal"].str.lower() == goal]

    if filtered.empty:
        return nutrition_df.sample(3).to_dict(orient="records")

    return filtered.to_dict(orient="records")