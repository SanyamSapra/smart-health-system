import ai, { hasGeminiKey } from "../config/gemini.js";
import User from "../models/User.js";
import HealthLog from "../models/HealthLog.js";
import {
  calculateAge,
  calculateBMI,
  calculateHealthScore,
  getTrendMessages,
} from "../utils/healthInsights.js";

const GEMINI_MODEL = "gemini-3-flash-preview";
const INSIGHTS_CACHE_HOURS = 24;
const CHAT_LIMIT_PER_DAY = 10;

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function sendFallbackChat(res) {
  const data = {
    reply:
      "Please stay hydrated, eat balanced meals, and continue tracking your health regularly.\nIf you feel unwell or your readings stay abnormal, please speak with a doctor.",
    fallback: true,
  };

  return res.json({
    success: true,
    ...data,
    data,
  });
}

function buildWarning(log) {
  if (!log) return "";

  if (log.sugarLevel >= 200) {
    return "Your sugar level looks high. Please monitor it carefully and contact a doctor if it continues.";
  }

  if (log.systolicBP >= 140 || log.diastolicBP >= 90) {
    return "Your blood pressure looks high. Please rest, monitor it again, and consult a doctor if it stays high.";
  }

  return "";
}

async function getUserHealthContext(userId, days = 30) {
  const user = await User.findById(userId).select(
    "gender dateOfBirth height medicalConditions aiInsights aiChatUsage"
  );

  const latestLog = await HealthLog.findOne({ user: userId }).sort({ loggedAt: -1 });

  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await HealthLog.find({
    user: userId,
    loggedAt: { $gte: since },
  })
    .sort({ loggedAt: 1 })
    .select("weight systolicBP diastolicBP sugarLevel loggedAt");

  let latestWeight = latestLog?.weight ?? null;
  if (latestWeight == null) {
    const latestWeightLog = await HealthLog.findOne({
      user: userId,
      weight: { $ne: null },
    }).sort({ loggedAt: -1 });

    latestWeight = latestWeightLog?.weight ?? null;
  }

  const age = calculateAge(user?.dateOfBirth);
  const bmi = calculateBMI(user?.height, latestWeight);
  const healthScore = calculateHealthScore({
    bmi,
    systolicBP: latestLog?.systolicBP,
    diastolicBP: latestLog?.diastolicBP,
    sugarLevel: latestLog?.sugarLevel,
  });

  return {
    user,
    latestLog,
    logs,
    age,
    latestWeight,
    bmi,
    healthScore,
  };
}

function getAbnormalSummary({ latestLog, bmi }) {
  const items = [];

  if (bmi != null) {
    if (bmi < 18.5) items.push(`BMI is low (${bmi})`);
    else if (bmi >= 30) items.push(`BMI is high (${bmi})`);
    else if (bmi >= 25) items.push(`BMI is above ideal range (${bmi})`);
  }

  if (latestLog?.systolicBP != null || latestLog?.diastolicBP != null) {
    if (latestLog.systolicBP >= 140 || latestLog.diastolicBP >= 90) {
      items.push(
        `blood pressure is high (${latestLog.systolicBP}/${latestLog.diastolicBP})`
      );
    } else if (latestLog.systolicBP >= 130 || latestLog.diastolicBP >= 80) {
      items.push(
        `blood pressure is slightly elevated (${latestLog.systolicBP}/${latestLog.diastolicBP})`
      );
    }
  }

  if (latestLog?.sugarLevel != null) {
    if (latestLog.sugarLevel >= 200) {
      items.push(`sugar level is high (${latestLog.sugarLevel} mg/dL)`);
    } else if (latestLog.sugarLevel >= 126) {
      items.push(`sugar level is above ideal range (${latestLog.sugarLevel} mg/dL)`);
    }
  }

  return items.length ? items.join("; ") : "No clearly abnormal latest values";
}

function getChatPrompt({
  user,
  latestLog,
  latestWeight,
  logs,
  trends,
  age,
  bmi,
  message,
}) {
  const recentSummary = logs
    .slice(-7)
    .map(
      (log) =>
        `${new Date(log.loggedAt).toLocaleDateString("en-IN")}: weight ${
          log.weight ?? "-"
        }, BP ${log.systolicBP ?? "-"}/${log.diastolicBP ?? "-"}, sugar ${
          log.sugarLevel ?? "-"
        }`
    )
    .join("\n");

  return `You are a helpful health assistant for a student project.

User profile:
- Age: ${age ?? "Unknown"}
- Gender: ${user.gender || "Unknown"}
- Medical conditions: ${
    user.medicalConditions?.length
      ? user.medicalConditions.join(", ")
      : "None mentioned"
  }

Latest health data:
- Weight: ${latestWeight ?? "Not available"} kg
- Blood pressure: ${latestLog?.systolicBP ?? "N/A"}/${
    latestLog?.diastolicBP ?? "N/A"
  } mmHg
- Sugar level: ${latestLog?.sugarLevel ?? "N/A"} mg/dL
- BMI: ${bmi ?? "Not available"}

Last 7 days:
${recentSummary || "No recent health logs"}

Trend summary:
${trends.length ? trends.join("; ") : "No clear trend available"}

Priority context:
${getAbnormalSummary({ latestLog, bmi })}

User question:
${message}

Rules:
- Reply in simple language in 3–5 short lines
- Prioritize abnormal values only when relevant to the user's question
- Use trends when they add useful context
- Do not repeat the same warning unless it is important for this question
- Do not mention metrics unless relevant
- Give safe preventive health advice
- Do not diagnose

IMPORTANT:
- Use health data ONLY if it is directly relevant to the question
- Do NOT mention sugar, BP, or other metrics unnecessarily
- Avoid repeating the same condition in every response
- Keep the response natural and conversational
- If the question is general (like headache or tiredness), give general advice first`;
}

function getInsightsPrompt({ user, latestLog, latestWeight, logs, age, bmi, healthScore, trends }) {
  const recentSummary = logs
    .slice(-7)
    .map(
      (log) =>
        `${new Date(log.loggedAt).toLocaleDateString("en-IN")}: weight ${log.weight ?? "-"}, BP ${log.systolicBP ?? "-"}/${log.diastolicBP ?? "-"}, sugar ${log.sugarLevel ?? "-"}`
    )
    .join("\n");

  return `Review this health data and respond in exact JSON.

User:
- Age: ${age ?? "Unknown"}
- Gender: ${user.gender || "Unknown"}
- Medical conditions: ${user.medicalConditions?.length ? user.medicalConditions.join(", ") : "None"}

Latest:
- Weight: ${latestWeight ?? "N/A"} kg
- BMI: ${bmi ?? "N/A"}
- Blood pressure: ${latestLog?.systolicBP ?? "N/A"}/${latestLog?.diastolicBP ?? "N/A"} mmHg
- Sugar: ${latestLog?.sugarLevel ?? "N/A"} mg/dL
- Health score: ${healthScore.score} (${healthScore.status})

Recent logs:
${recentSummary || "No recent logs"}

Current trends:
${trends.length ? trends.join("; ") : "No clear trend"}

Rules:
- Prioritize abnormal BMI, blood pressure, or sugar values
- Use trends if available
- Avoid repeating the same warning in multiple fields
- Keep every insight and tip short
- Do not mention metrics unless they are relevant
- Do not give a diagnosis

Return JSON only:
{"insights":["","",""],"tips":["","",""],"warning":""}`;
}

function parseInsightsText(text, fallbackWarning = "") {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : [],
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 3) : [],
      warning: typeof parsed.warning === "string" ? parsed.warning : fallbackWarning,
    };
  } catch {
    return null;
  }
}

export const chatWithAssistant = async (req, res) => {
  try {
    const message = req.body.message?.trim();

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const user = await User.findById(req.userId).select("aiChatUsage");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const todayKey = getTodayKey();
    if (user.aiChatUsage?.date !== todayKey) {
      user.aiChatUsage = { date: todayKey, count: 0 };
    }

    if (user.aiChatUsage.count >= CHAT_LIMIT_PER_DAY) {
      return res.status(429).json({
        success: false,
        message: "Daily chat limit reached. Please try again tomorrow.",
      });
    }

    user.aiChatUsage.count += 1;
    await user.save();

    if (!hasGeminiKey || !ai) {
      return sendFallbackChat(res);
    }

    const context = await getUserHealthContext(req.userId, 7);
    const trends = getTrendMessages(context.logs);
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: getChatPrompt({
        user: context.user,
        latestLog: context.latestLog,
        latestWeight: context.latestWeight,
        logs: context.logs,
        trends,
        age: context.age,
        bmi: context.bmi,
        message,
      }),
    });

    const reply = result.text?.trim();
    if (!reply) {
      return sendFallbackChat(res);
    }

    const data = {
      reply,
      remainingRequests: CHAT_LIMIT_PER_DAY - user.aiChatUsage.count,
      fallback: false,
    };

    return res.json({
      success: true,
      ...data,
      data,
    });
  } catch (error) {
    console.error("AI chat error:", error.message);
    return sendFallbackChat(res);
  }
};

export const getDashboardInsights = async (req, res) => {
  try {
    const context = await getUserHealthContext(req.userId, 30);

    if (!context.user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const generatedAt = context.user.aiInsights?.generatedAt;
    if (generatedAt) {
      const hoursSinceGeneration =
        (Date.now() - new Date(generatedAt).getTime()) / (1000 * 60 * 60);

      if (hoursSinceGeneration < INSIGHTS_CACHE_HOURS) {
        return res.json({
          success: true,
          cached: true,
          data: {
            insights: context.user.aiInsights.insights || [],
            tips: context.user.aiInsights.tips || [],
            warning: context.user.aiInsights.warning || "",
            generatedAt,
          },
        });
      }
    }

    const fallbackData = {
      insights: [
        context.logs.length
          ? `You have ${context.logs.length} health log entries in the recent period.`
          : "You do not have enough recent health logs yet.",
        context.bmi != null
          ? `Your current BMI is ${context.bmi}.`
          : "Add weight logs to view BMI-based insight.",
        context.latestLog
          ? `Your health score is ${context.healthScore.score} (${context.healthScore.status}).`
          : "More health data will improve your dashboard insights.",
      ],
      tips: [
        "Log your health regularly to track changes clearly.",
        "Drink enough water and try to keep meals balanced.",
        "Check unusual readings again and consult a doctor if needed.",
      ],
      warning: buildWarning(context.latestLog),
    };

    if (!hasGeminiKey || !ai || context.logs.length === 0) {
      context.user.aiInsights = {
        ...fallbackData,
        generatedAt: new Date(),
      };
      await context.user.save();

      return res.json({
        success: true,
        cached: false,
        data: context.user.aiInsights,
      });
    }

    const trends = getTrendMessages(context.logs);
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: getInsightsPrompt({
        user: context.user,
        latestLog: context.latestLog,
        latestWeight: context.latestWeight,
        logs: context.logs,
        age: context.age,
        bmi: context.bmi,
        healthScore: context.healthScore,
        trends,
      }),
    });

    const parsed = parseInsightsText(result.text?.trim() || "", fallbackData.warning);
    const savedInsights = parsed || fallbackData;

    context.user.aiInsights = {
      insights: savedInsights.insights.length ? savedInsights.insights : fallbackData.insights,
      tips: savedInsights.tips.length ? savedInsights.tips : fallbackData.tips,
      warning: savedInsights.warning || fallbackData.warning,
      generatedAt: new Date(),
    };
    await context.user.save();

    return res.json({
      success: true,
      cached: false,
      data: context.user.aiInsights,
    });
  } catch (error) {
    console.error("AI insights error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate insights",
    });
  }
};
