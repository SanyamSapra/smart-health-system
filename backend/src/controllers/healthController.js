import User from "../models/User.js";
import HealthLog from "../models/HealthLog.js";
import mongoose from "mongoose";
import {
  calculateAge,
  calculateBMI,
  calculateHealthScore,
  countLoggedDaysLast7,
  getHealthStatus,
  getMissingDataWarnings,
  getTrendMessages,
  hasLoggedToday,
} from "../utils/healthInsights.js";
import { checkAndSendDailyReminder } from "../utils/dailyReminder.js";

function getPagination(query) {
  const page = Number.parseInt(query.page, 10) || 1;
  const limit = Number.parseInt(query.limit, 10) || 10;

  return {
    page: Math.max(page, 1),
    limit: Math.min(Math.max(limit, 1), 100),
  };
}

function sendValidationError(res, error) {
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages[0] });
  }

  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again.",
  });
}

function validateHealthPayload(payload, { partial = false } = {}) {
  const allowedFields = ["weight", "systolicBP", "diastolicBP", "sugarLevel", "notes"];
  const updates = {};

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      updates[field] = payload[field];
    }
  }

  if (!partial) {
    const hasMetric =
      updates.weight != null ||
      updates.systolicBP != null ||
      updates.diastolicBP != null ||
      updates.sugarLevel != null;

    if (!hasMetric) {
      return { error: "At least one health metric is required" };
    }
  }

  const numericFields = ["weight", "systolicBP", "diastolicBP", "sugarLevel"];
  for (const field of numericFields) {
    if (updates[field] != null && !Number.isFinite(Number(updates[field]))) {
      return { error: `${field} must be a valid number` };
    }
  }

  if (updates.weight != null && (Number(updates.weight) < 20 || Number(updates.weight) > 300)) {
    return { error: "Weight must be between 20 and 300 kg" };
  }

  if (
    updates.systolicBP != null &&
    (Number(updates.systolicBP) < 60 || Number(updates.systolicBP) > 250)
  ) {
    return { error: "Systolic BP must be between 60 and 250" };
  }

  if (
    updates.diastolicBP != null &&
    (Number(updates.diastolicBP) < 40 || Number(updates.diastolicBP) > 150)
  ) {
    return { error: "Diastolic BP must be between 40 and 150" };
  }

  if (
    updates.systolicBP != null &&
    updates.diastolicBP != null &&
    Number(updates.systolicBP) <= Number(updates.diastolicBP)
  ) {
    return { error: "Systolic BP must be higher than diastolic BP" };
  }

  if (
    updates.sugarLevel != null &&
    (Number(updates.sugarLevel) < 30 || Number(updates.sugarLevel) > 600)
  ) {
    return { error: "Sugar level must be between 30 and 600 mg/dL" };
  }

  if (updates.notes != null && String(updates.notes).length > 500) {
    return { error: "Notes cannot exceed 500 characters" };
  }

  return { updates };
}

// Get the latest health metrics for the dashboard
export const getLatestHealthSummary = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select(
      "height dateOfBirth email lastReminderSentAt"
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await checkAndSendDailyReminder(user);

    const latestLog = await HealthLog.findOne({ user: userId }).sort({
      loggedAt: -1,
    });

    if (!latestLog) {
      return res.json({
        success: true,
        message: "No health logs yet",
        data: {
          height: user.height,
          age: calculateAge(user.dateOfBirth),
          weight: null,
          systolicBP: null,
          diastolicBP: null,
          sugarLevel: null,
          bmi: null,
          healthScore: calculateHealthScore({}),
          healthStatus: "Needs Attention",
          streak: 0,
          missingDataWarnings: [
            "No BP data in last 7 days",
            "No weight data recently",
            "No sugar data in last 7 days",
          ],
          trends: [],
          loggedToday: false,
          lastUpdated: null,
        },
      });
    }

    let latestWeight = latestLog.weight ?? null;
    if (latestWeight == null) {
      const latestWeightLog = await HealthLog.findOne({
        user: userId,
        weight: { $ne: null },
      }).sort({ loggedAt: -1 });

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
    const healthStatus = getHealthStatus({
      bmi,
      systolicBP: latestLog.systolicBP,
      diastolicBP: latestLog.diastolicBP,
      sugarLevel: latestLog.sugarLevel,
    });
    const streak = countLoggedDaysLast7(recentLogs);
    const missingDataWarnings = getMissingDataWarnings(recentLogs);

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
        healthStatus,
        streak,
        missingDataWarnings,
        trends,
        loggedToday,
        lastUpdated: latestLog.loggedAt,
      },
    });
  } catch (error) {
    return sendValidationError(res, error);
  }
};

// Add a new health log entry
export const addHealthLog = async (req, res) => {
  try {
    const userId = req.userId;

    const { updates, error } = validateHealthPayload(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const newLog = await HealthLog.create({
      user: userId,
      ...updates,
    });

    return res.status(201).json({
      success: true,
      message: "Health log added successfully",
      data: newLog,
    });
  } catch (error) {
    return sendValidationError(res, error);
  }
};

// Fetch health history for charts (default: last 30 days)
export const getHealthHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const { page, limit } = getPagination(req.query);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const filter = {
      user: userId,
      loggedAt: { $gte: since },
    };

    const total = await HealthLog.countDocuments(filter);
    const logs = await HealthLog.find({
      ...filter,
    })
      .sort({ loggedAt: 1 }) // oldest → newest (better for charts)
      .select("weight systolicBP diastolicBP sugarLevel loggedAt")
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      success: true,
      count: logs.length,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      trends: getTrendMessages(logs),
      loggedToday: hasLoggedToday(logs),
      data: logs,
    });
  } catch (error) {
    return sendValidationError(res, error);
  }
};

// Update an existing health log
export const updateHealthLog = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid log ID" });
    }
    const { updates, error } = validateHealthPayload(req.body, { partial: true });
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

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

    return res.json({ success: true, data: log });
  } catch (error) {
    return sendValidationError(res, error);
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

    return res.json({ success: true, message: "Health log deleted" });
  } catch (error) {
    return sendValidationError(res, error);
  }
};
