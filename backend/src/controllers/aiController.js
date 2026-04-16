import crypto from "crypto";
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
const CHAT_CACHE_HOURS = 12;
const MAX_CHAT_HISTORY = 5;

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function sendFallbackChat(res) {
  return res.json({
    success: true,
    reply:
      "Please stay hydrated, eat balanced meals, and continue tracking your health regularly.\nIf you feel unwell or your readings stay abnormal, please speak with a doctor.",
    fallback: true,
  });
}

function normalizeText(text) {
  return (text || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function hashMessage(message) {
  return crypto.createHash("sha256").update(normalizeText(message)).digest("hex");
}

function detectIntent(message) {
  const normalized = normalizeText(message);

  if (/report|lab|scan|x-ray|prescription|summary|findings|diagnosis/.test(normalized)) {
    return "report_explanation";
  }

  if (/diet|exercise|sleep|stress|smoke|alcohol|hydration|water|lifestyle|nutrition|meal|food/.test(normalized)) {
    return "lifestyle_advice";
  }

  return "health_query";
}

function getIntentLabel(intent) {
  if (intent === "report_explanation") return "Report Explanation";
  if (intent === "lifestyle_advice") return "Lifestyle Advice";
  return "Health Query";
}

function findCachedChat(user, messageHash, latestLogTime) {
  if (!user?.aiChatCache?.length) return null;

  const cutoff = Date.now() - CHAT_CACHE_HOURS * 60 * 60 * 1000;
  return user.aiChatCache.find((cache) => {
    return (
      cache.messageHash === messageHash &&
      new Date(cache.createdAt).getTime() >= cutoff &&
      (!latestLogTime || new Date(cache.createdAt).getTime() >= new Date(latestLogTime).getTime())
    );
  });
}

function appendChatHistory(user, userMessage, assistantMessage, intent) {
  const history = user.aiChatHistory || [];
  history.push({ userMessage, assistantMessage, intent, createdAt: new Date() });
  return history.slice(-MAX_CHAT_HISTORY);
}

function buildSystemPrompt() {
  return `You are a preventive healthcare assistant. Do not diagnose. Only give safe, general advice. If the user asks about a report, explain it in an easy, mindful way. Keep the tone encouraging and avoid medical jargon.`;
}

function buildPreviousResponsesSection(history) {
  if (!history?.length) return "";

  return history
    .map(
      (item, index) =>
        `Previous response ${index + 1} (intent: ${item.intent}): ${item.assistantMessage}`
    )
    .join("\n");
}

function buildLimitInstruction(message) {
  const normalized = normalizeText(message);
  if (normalized.includes("same") || normalized.includes("repeat")) {
    return "If the user is repeating a similar question, rephrase the response with slightly different wording and keep it helpful.";
  }

  return "";
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
    "gender dateOfBirth height medicalConditions aiInsights aiChatUsage aiChatCache aiChatHistory"
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

function getChatPrompt({
  user,
  latestLog,
  latestWeight,
  age,
  bmi,
  message,
  intent,
  history,
  healthScore,
}) {
  const toneStyles = [
    "friendly and conversational",
    "concise and practical",
    "supportive and coaching",
  ];

  const tone = toneStyles[Math.floor(Math.random() * toneStyles.length)];

  return `${buildSystemPrompt()}

Tone: ${tone}

Intent: ${getIntentLabel(intent)}

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
- Health score: ${healthScore.score} (${healthScore.category})

${
  history?.length
    ? `Previous assistant responses:\n${buildPreviousResponsesSection(history)}\n`
    : ""
}

${buildLimitInstruction(message)}

User question:
${message}

---

Response Style (CRITICAL):

- Respond like a real human, not a textbook or article
- Keep it conversational and natural
- Avoid long explanations unless necessary
- Do NOT try to cover every possible tip

Structure:
1. Acknowledge the concern naturally (1 line)
2. Give one personalized insight (based on user data)
3. Suggest 1–2 practical things (not a long list)
4. Optionally ask a simple follow-up question

Tone:
- Friendly, calm, and slightly informal
- Avoid robotic or formal language
- Avoid structured bullet lists unless absolutely needed

STRICTLY AVOID:
- Over-explaining basic concepts
- Giving 4–5 tips at once
- Repeating common advice like "drink water" unless very relevant
- Sounding like a blog or health article

---

Goal:
Make the response feel personalized, intelligent, and different each time — not like a template.
`;
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
- Health score: ${healthScore.score} (${healthScore.category})

Recent logs:
${recentSummary || "No recent logs"}

Current trends:
${trends.length ? trends.join("; ") : "No clear trend"}

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

    const user = await User.findById(req.userId).select(
      "aiChatUsage aiChatCache aiChatHistory"
    );
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

    const context = await getUserHealthContext(req.userId, 7);
    const messageHash = hashMessage(message);
    const cached = findCachedChat(user, messageHash, context.latestLog?.loggedAt);

    if (cached) {
      user.aiChatUsage.count += 1;
      await user.save();
      return res.json({
        success: true,
        reply: cached.reply,
        remainingRequests: CHAT_LIMIT_PER_DAY - user.aiChatUsage.count,
        cached: true,
        fallback: false,
      });
    }

    user.aiChatUsage.count += 1;
    await user.save();

    if (!hasGeminiKey || !ai) {
      return sendFallbackChat(res);
    }

    const intent = detectIntent(message);
    const history = (user.aiChatHistory || []).slice(-MAX_CHAT_HISTORY);
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: getChatPrompt({
        user: context.user,
        latestLog: context.latestLog,
        latestWeight: context.latestWeight,
        age: context.age,
        bmi: context.bmi,
        message,
        intent,
        history,
        healthScore: context.healthScore,
      }),
    });

    const reply = result.text?.trim();
    if (!reply) {
      return sendFallbackChat(res);
    }

    const updatedCache = user.aiChatCache || [];
    updatedCache.push({
      messageHash,
      normalizedMessage: normalizeText(message),
      reply,
      createdAt: new Date(),
    });

    user.aiChatCache = updatedCache.slice(-20);
    user.aiChatHistory = appendChatHistory(user, message, reply, intent);
    await user.save();

    return res.json({
      success: true,
      reply,
      remainingRequests: CHAT_LIMIT_PER_DAY - user.aiChatUsage.count,
      fallback: false,
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
          ? `Your health score is ${context.healthScore.score} (${context.healthScore.category}).`
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
