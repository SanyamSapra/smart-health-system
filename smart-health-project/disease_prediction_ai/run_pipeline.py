import sys
import logging
from pathlib import Path
import pandas as pd
import joblib

sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.dataset_merger import DatasetMerger
from src.analyze_dataset import DatasetAnalyzer
from src.train_model import ModelTrainer
from src.utils import DATASET_DIR, MODELS_DIR

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
)

logger = logging.getLogger("pipeline")


def train_nutrition_model():
    """Process nutrition dataset into a structured lookup model"""

    path = DATASET_DIR / "nutrition_dataset.csv"
    if not path.exists():
        logger.warning("Nutrition dataset not found")
        return None

    df = pd.read_csv(path)

    # Normalize disease names
    df["disease"] = df["disease"].str.lower().str.strip()

    nutrition_map = {}

    for _, row in df.iterrows():
        disease = row["disease"]

        nutrition_map[disease] = {
            "eat": str(row.get("food_to_eat", "")).split(","),
            "avoid": str(row.get("food_to_avoid", "")).split(","),
        }

    # Save model
    joblib.dump(nutrition_map, MODELS_DIR / "nutrition_model.pkl")

    logger.info("✓ Nutrition model saved")
    return nutrition_map


def train_fitness_model():
    """Process fitness dataset into a structured lookup model"""

    path = DATASET_DIR / "fitness_dataset.csv"
    if not path.exists():
        logger.warning("Fitness dataset not found")
        return None

    df = pd.read_csv(path)

    df["disease"] = df["disease"].str.lower().str.strip()

    fitness_map = {}

    for _, row in df.iterrows():
        disease = row["disease"]

        fitness_map[disease] = str(row.get("exercises", "")).split(",")

    # Save model
    joblib.dump(fitness_map, MODELS_DIR / "fitness_model.pkl")

    logger.info("✓ Fitness model saved")
    return fitness_map


def main():
    logger.info("=" * 60)
    logger.info("AI Health Pipeline (Disease + Nutrition + Fitness)")
    logger.info("=" * 60)

    # ── STEP 1: Merge datasets ─────────────────────────
    logger.info("\n[ STEP 1 ] Merging disease datasets …")
    merger = DatasetMerger()
    df = merger.merge_all()

    logger.info("✓ Rows: %d | Diseases: %d | Symptoms: %d",
                len(df), df["disease"].nunique(), df.shape[1] - 1)

    # ── STEP 2: Analyse ────────────────────────────────
    logger.info("\n[ STEP 2 ] Analysing dataset …")
    analyzer = DatasetAnalyzer(df)
    report = analyzer.analyse()

    # ── STEP 3: Train disease model ────────────────────
    logger.info("\n[ STEP 3 ] Training disease model …")
    trainer = ModelTrainer(df)
    training_report = trainer.train()

    logger.info("✓ Accuracy: %.2f%%",
                training_report["test_accuracy"] * 100)

    # ── STEP 4: Train Nutrition Model ──────────────────
    logger.info("\n[ STEP 4 ] Processing nutrition dataset …")
    train_nutrition_model()

    # ── STEP 5: Train Fitness Model ────────────────────
    logger.info("\n[ STEP 5 ] Processing fitness dataset …")
    train_fitness_model()

    logger.info("\n[ DONE ] All models saved to: %s", MODELS_DIR)
    logger.info("=" * 60)


if __name__ == "__main__":
    main()