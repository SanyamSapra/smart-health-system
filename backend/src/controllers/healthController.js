import User from "../models/User.js";
import HealthLog from "../models/HealthLog.js";
import mongoose from "mongoose";
import {
  calculateAge,
  calculateBMI,
  calculateHealthScore,
  getTrendMessages,
  hasLoggedToday,
} from "../utils/healthInsights.js";

function sanitizeMetric(value) {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function invalidateAiCache(userId) {
  await User.findByIdAndUpdate(userId, {
    $set: {
      "aiInsights.generatedAt": null,
      aiChatCache: [],
    },
  });
}

// Get the latest health metrics for the dashboard
export const getLatestHealthSummary = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("height dateOfBirth");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const latestLog = await HealthLog.findOne({ user: userId })
      .sort({ loggedAt: -1 })
      .select("weight systolicBP diastolicBP sugarLevel loggedAt")
      .lean();

    if (!latestLog) {
      return res.json({
        success: true,
        message: "No health logs yet",
        data: null,
      });
    }

    let latestWeight = latestLog.weight ?? null;
    if (latestWeight == null) {
      const latestWeightLog = await HealthLog.findOne({
        user: userId,
        weight: { $ne: null },
      })
        .sort({ loggedAt: -1 })
        .select("weight")
        .lean();

      latestWeight = latestWeightLog?.weight ?? null;
    }

    const bmi = calculateBMI(user.height, latestWeight);
    const age = calculateAge(user.dateOfBirth);

    const recentLogs = await HealthLog.find({
      user: userId,
      loggedAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    })
      .sort({ loggedAt: 1 })
      .select("weight systolicBP diastolicBP sugarLevel loggedAt");

    const healthScore = calculateHealthScore({
      bmi,
      systolicBP: latestLog.systolicBP,
      diastolicBP: latestLog.diastolicBP,
      sugarLevel: latestLog.sugarLevel,
    });

    const trends = getTrendMessages(recentLogs);
    const loggedToday = hasLoggedToday(recentLogs);

    return res.json({
      success: true,
      data: {
        height: user.height,
        age,
        weight: latestWeight,
        systolicBP: latestLog.systolicBP,
        diastolicBP: latestLog.diastolicBP,
        sugarLevel: latestLog.sugarLevel,
        bmi,
        healthScore,
        trends,
        loggedToday,
        lastUpdated: latestLog.loggedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Add a new health log entry
export const addHealthLog = async (req, res) => {
  try {
    const userId = req.userId;
    const { weight, systolicBP, diastolicBP, sugarLevel, notes } = req.body;

    const cleanWeight = sanitizeMetric(weight);
    const cleanSystolic = sanitizeMetric(systolicBP);
    const cleanDiastolic = sanitizeMetric(diastolicBP);
    const cleanSugar = sanitizeMetric(sugarLevel);

    if (
      cleanWeight === undefined &&
      cleanSystolic === undefined &&
      cleanDiastolic === undefined &&
      cleanSugar === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one valid health metric is required",
      });
    }

    const newLog = await HealthLog.create({
      user: userId,
      weight: cleanWeight,
      systolicBP: cleanSystolic,
      diastolicBP: cleanDiastolic,
      sugarLevel: cleanSugar,
      notes: typeof notes === "string" ? notes.trim() : notes,
    });

    await invalidateAiCache(userId);

    return res.status(201).json({
      success: true,
      message: "Health log added successfully",
      data: newLog,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }

    return res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch health history for charts (default: last 30 days)
export const getHealthHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await HealthLog.find({
      user: userId,
      loggedAt: { $gte: since },
    })
      .sort({ loggedAt: 1 }) // oldest → newest (better for charts)
      .select("weight systolicBP diastolicBP sugarLevel loggedAt")
      .limit(200); // safety limit

    return res.json({
      success: true,
      count: logs.length,
      trends: getTrendMessages(logs),
      loggedToday: hasLoggedToday(logs),
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update an existing health log
export const updateHealthLog = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid log ID" });
    }
    const { weight, systolicBP, diastolicBP, sugarLevel, notes } = req.body;

    // Only update fields that were provided
    const updates = {};
    if (weight !== undefined) updates.weight = weight;
    if (systolicBP !== undefined) updates.systolicBP = systolicBP;
    if (diastolicBP !== undefined) updates.diastolicBP = diastolicBP;
    if (sugarLevel !== undefined) updates.sugarLevel = sugarLevel;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update",
      });
    }

    const log = await HealthLog.findOneAndUpdate(
      { _id: req.params.id, user: req.userId }, // ensures user can only update their own logs
      updates,
      { new: true, runValidators: true }
    );

    if (!log) {
      return res
        .status(404)
        .json({ success: false, message: "Health log not found" });
    }

    await invalidateAiCache(req.userId);

    return res.json({ success: true, data: log });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }

    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a health log
export const deleteHealthLog = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid log ID" });
    }
    const log = await HealthLog.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!log) {
      return res
        .status(404)
        .json({ success: false, message: "Health log not found" });
    }

    await invalidateAiCache(req.userId);

    return res.json({ success: true, message: "Health log deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
