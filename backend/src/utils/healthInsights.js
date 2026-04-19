export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;

  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export function calculateBMI(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;

  const heightInMeters = heightCm / 100;
  if (!heightInMeters) return null;

  return Number((weightKg / (heightInMeters * heightInMeters)).toFixed(2));
}

export function calculateHealthScore({ bmi, systolicBP, diastolicBP, sugarLevel }) {
  let score = 100;

  if (bmi != null) {
    if (bmi < 18.5 || bmi > 30) score -= 20;
    else if (bmi >= 25) score -= 10;
  }

  if (systolicBP != null || diastolicBP != null) {
    if (systolicBP >= 140 || diastolicBP >= 90) score -= 25;
    else if (systolicBP >= 130 || diastolicBP >= 80) score -= 12;
  }

  if (sugarLevel != null) {
    if (sugarLevel >= 200) score -= 25;
    else if (sugarLevel >= 126) score -= 15;
    else if (sugarLevel >= 100) score -= 8;
  }

  score = Math.max(0, Math.min(100, score));

  let status = "Good";
  if (score < 50) status = "Poor";
  else if (score < 75) status = "Moderate";

  return { score, status };
}

export function getHealthStatus({ bmi, systolicBP, diastolicBP, sugarLevel }) {
  const highRisk =
    (bmi != null && (bmi < 16 || bmi >= 35)) ||
    (systolicBP != null && systolicBP >= 160) ||
    (diastolicBP != null && diastolicBP >= 100) ||
    (sugarLevel != null && sugarLevel >= 200);

  if (highRisk) {
    return "High Risk";
  }

  const needsAttention =
    (bmi != null && (bmi < 18.5 || bmi >= 25)) ||
    (systolicBP != null && systolicBP >= 130) ||
    (diastolicBP != null && diastolicBP >= 80) ||
    (sugarLevel != null && sugarLevel >= 126);

  return needsAttention ? "Needs Attention" : "Good";
}

export function countLoggedDaysLast7(logs = []) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const days = new Set();

  logs.forEach((log) => {
    const loggedAt = new Date(log.loggedAt);
    if (loggedAt >= sevenDaysAgo) {
      days.add(loggedAt.toISOString().split("T")[0]);
    }
  });

  return days.size;
}

export function getMissingDataWarnings(logs = []) {
  const warnings = [];
  const hasWeight = logs.some((log) => log.weight != null);
  const hasBP = logs.some(
    (log) => log.systolicBP != null && log.diastolicBP != null
  );
  const hasSugar = logs.some((log) => log.sugarLevel != null);

  if (!hasBP) warnings.push("No BP data in last 7 days");
  if (!hasWeight) warnings.push("No weight data recently");
  if (!hasSugar) warnings.push("No sugar data in last 7 days");

  return warnings;
}

function getTrendDirection(change, positiveMessage, negativeMessage, stableMessage) {
  if (change > 0) return positiveMessage;
  if (change < 0) return negativeMessage;
  return stableMessage;
}

export function getTrendMessages(logs = []) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const recentLogs = logs
    .filter((log) => new Date(log.loggedAt) >= sevenDaysAgo)
    .sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt));

  const trends = [];

  const weightLogs = recentLogs.filter((log) => log.weight != null);
  if (weightLogs.length >= 2) {
    const change = Number((weightLogs.at(-1).weight - weightLogs[0].weight).toFixed(1));
    if (change !== 0) {
      trends.push(
        `Your weight ${change > 0 ? "increased" : "decreased"} by ${Math.abs(change)} kg in the last 7 days`
      );
    } else {
      trends.push("Your weight stayed stable in the last 7 days");
    }
  }

  const sugarLogs = recentLogs.filter((log) => log.sugarLevel != null);
  if (sugarLogs.length >= 2) {
    const change = sugarLogs.at(-1).sugarLevel - sugarLogs[0].sugarLevel;
    trends.push(
      getTrendDirection(
        change,
        "Your sugar levels are increasing",
        "Your sugar levels are improving",
        "Your sugar levels stayed steady"
      )
    );
  }

  const bpLogs = recentLogs.filter(
    (log) => log.systolicBP != null && log.diastolicBP != null
  );
  if (bpLogs.length >= 2) {
    const first = bpLogs[0];
    const last = bpLogs.at(-1);
    const systolicChange = last.systolicBP - first.systolicBP;
    const diastolicChange = last.diastolicBP - first.diastolicBP;

    if (systolicChange < 0 && diastolicChange < 0) {
      trends.push("Your blood pressure trend is improving");
    } else if (systolicChange > 0 || diastolicChange > 0) {
      trends.push("Your blood pressure trend is increasing");
    } else {
      trends.push("Your blood pressure is stable");
    }
  }

  return trends;
}

export function hasLoggedToday(logs = []) {
  const today = new Date();
  const todayString = today.toDateString();

  return logs.some((log) => new Date(log.loggedAt).toDateString() === todayString);
}

export function getReportTips(extractedValues = {}) {
  const values = Object.entries(extractedValues).map(([key, value]) => ({
    key: key.toLowerCase(),
    value: String(value).toLowerCase(),
  }));

  const tips = [];

  const hemoglobinItem = values.find((item) => item.key.includes("hemoglobin"));
  if (hemoglobinItem) {
    const hemoglobinValue = parseFloat(hemoglobinItem.value);
    if (!Number.isNaN(hemoglobinValue) && hemoglobinValue < 12) {
      tips.push("Low hemoglobin detected. Add iron-rich foods like spinach, beans, and dates.");
    }
  }

  const sugarItem = values.find(
    (item) =>
      item.key.includes("sugar") ||
      item.key.includes("glucose") ||
      item.key.includes("hba1c")
  );
  if (sugarItem) {
    const sugarValue = parseFloat(sugarItem.value);
    if (!Number.isNaN(sugarValue)) {
      if (
        (sugarItem.key.includes("hba1c") && sugarValue > 6.4) ||
        (!sugarItem.key.includes("hba1c") && sugarValue > 125)
      ) {
        tips.push("High sugar reading found. Reduce sugary drinks and follow a balanced diet.");
      }
    }
  }

  return tips;
}
