export const HEALTH_SCORE_CATEGORY = {
  GOOD: "Good",
  AVERAGE: "Average",
  POOR: "Poor",
};

function normalizeNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function calculateHealthScore({ bmi, systolicBP, diastolicBP, sugarLevel }) {
  const normalizedBmi = normalizeNumber(bmi);
  const normalizedSystolic = normalizeNumber(systolicBP);
  const normalizedDiastolic = normalizeNumber(diastolicBP);
  const normalizedSugar = normalizeNumber(sugarLevel);

  let score = 100;
  const tips = [];

  // Weight and BMI correction
  if (normalizedBmi != null) {
    if (normalizedBmi < 18.5) {
      score -= 18;
      tips.push("Your BMI is low. Try balanced meals and safe strength-building activities.");
    } else if (normalizedBmi >= 25 && normalizedBmi < 30) {
      score -= 10;
      tips.push("Your BMI is slightly above the healthy range. Increase physical activity and reduce processed foods.");
    } else if (normalizedBmi >= 30) {
      score -= 22;
      tips.push("Your BMI is in the higher range. Aim for gradual, healthy weight loss with regular exercise.");
    }
  } else {
    tips.push("Add your height and weight to get a more accurate health score.");
  }

  // Blood pressure ranges
  if (normalizedSystolic != null || normalizedDiastolic != null) {
    if (
      (normalizedSystolic != null && normalizedSystolic >= 140) ||
      (normalizedDiastolic != null && normalizedDiastolic >= 90)
    ) {
      score -= 28;
      tips.push("Your blood pressure is high. Reduce salt, manage stress, and re-check it soon.");
    } else if (
      (normalizedSystolic != null && normalizedSystolic >= 130) ||
      (normalizedDiastolic != null && normalizedDiastolic >= 80)
    ) {
      score -= 14;
      tips.push("Your blood pressure is elevated. Keep tracking it and stay active.");
    } else if (
      (normalizedSystolic != null && normalizedSystolic >= 120) ||
      (normalizedDiastolic != null && normalizedDiastolic >= 80)
    ) {
      score -= 6;
      tips.push("Your blood pressure is slightly above the ideal range. Keep an eye on it.");
    }
  } else {
    tips.push("Add blood pressure readings for a more complete health score.");
  }

  // Sugar thresholds
  if (normalizedSugar != null) {
    if (normalizedSugar >= 200) {
      score -= 30;
      tips.push("Your sugar reading is high. Avoid sugary drinks and follow a balanced meal plan.");
    } else if (normalizedSugar >= 126) {
      score -= 18;
      tips.push("Your sugar value is in the prediabetes range. Reduce refined carbs and monitor it closely.");
    } else if (normalizedSugar >= 100) {
      score -= 10;
      tips.push("Your sugar level is slightly elevated. Stay hydrated and watch your sugar intake.");
    }
  } else {
    tips.push("Add your blood sugar readings to refine the health score.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let category = HEALTH_SCORE_CATEGORY.GOOD;
  if (score < 50) {
    category = HEALTH_SCORE_CATEGORY.POOR;
  } else if (score < 75) {
    category = HEALTH_SCORE_CATEGORY.AVERAGE;
  }

  return {
    score,
    category,
    status: category,
    tips: tips.slice(0, 3),
  };
}
