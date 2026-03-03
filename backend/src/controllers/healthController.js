import User from "../models/User.js";
import HealthLog from "../models/HealthLog.js";


export const getLatestHealthSummary = async (req, res) => {
  try {
    const userId = req.userId;

    // Get user profile
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get latest health log
    const latestLog = await HealthLog
      .findOne({ user: userId })
      .sort({ loggedAt: -1 });

    if (!latestLog) {
      return res.json({
        success: true,
        message: "No health logs yet",
        data: null
      });
    }

    // Calculate BMI
    let bmi = null;

    if (user.height && latestLog.weight) {
      const heightInMeters = user.height / 100;
      bmi = latestLog.weight / (heightInMeters * heightInMeters);
      bmi = bmi.toFixed(2);
    }

    res.json({
      success: true,
      data: {
        height: user.height,
        weight: latestLog.weight,
        systolicBP: latestLog.systolicBP,
        diastolicBP: latestLog.diastolicBP,
        sugarLevel: latestLog.sugarLevel,
        bmi
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const addHealthLog = async (req, res) => {
  try {
    const userId = req.userId; // from auth middleware

    const { weight, systolicBP, diastolicBP, sugarLevel, notes } = req.body;

    if (!weight && !systolicBP && !diastolicBP && !sugarLevel) {
      return res.status(400).json({
        success: false,
        message: "At least one health field is required"
      });
    }

    const newLog = await HealthLog.create({
      user: userId,
      weight,
      systolicBP,
      diastolicBP,
      sugarLevel,
      notes
    });

    res.status(201).json({
      success: true,
      message: "Health log added successfully",
      data: newLog
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};