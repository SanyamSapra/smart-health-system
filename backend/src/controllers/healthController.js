import User from "../models/User.js";
import HealthLog from "../models/HealthLog.js";
import mongoose from "mongoose";

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

    const latestLog = await HealthLog.findOne({ user: userId }).sort({
      loggedAt: -1,
    });

    if (!latestLog) {
      return res.json({
        success: true,
        message: "No health logs yet",
        data: null,
      });
    }

    // BMI calculation using height (cm) and weight (kg)
    let bmi = null;

    if (user.height) {
      const latestWeightLog = await HealthLog.findOne({
        user: userId,
        weight: { $ne: null }
      }).sort({ loggedAt: -1 });

      if (latestWeightLog?.weight) {
        const heightInMeters = user.height / 100;
        bmi = Number(
          (latestWeightLog.weight / (heightInMeters * heightInMeters)).toFixed(2)
        );
      }
    }

    // Calculate age from date of birth
    let age = null;
    if (user.dateOfBirth) {
      const today = new Date();
      const birth = new Date(user.dateOfBirth);
      age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age--;
      }
    }

    return res.json({
      success: true,
      data: {
        height: user.height,
        age,
        weight: latestLog.weight,
        systolicBP: latestLog.systolicBP,
        diastolicBP: latestLog.diastolicBP,
        sugarLevel: latestLog.sugarLevel,
        bmi,
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

    if (weight == null && systolicBP == null && diastolicBP == null && sugarLevel == null) {
      return res.status(400).json({
        success: false,
        message: "At least one health metric is required",
      });
    }

    const newLog = await HealthLog.create({
      user: userId,
      weight,
      systolicBP,
      diastolicBP,
      sugarLevel,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Health log added successfully",
      data: newLog,
    });
  } catch (error) {
    // Return schema validation errors in a cleaner way
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

    return res.json({ success: true, message: "Health log deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};