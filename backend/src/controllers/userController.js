import User from "../models/User.js";
import HealthLog from "../models/HealthLog.js";
import { calculateAge } from "../utils/healthInsights.js";
import { createDefaultReminderForUser } from "./reminderController.js";

// Get logged-in user's profile data
export const getUserData = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "name email isAccountVerified profileCompleted gender height dateOfBirth bloodGroup activityLevel dietType smoking alcohol medicalConditions"
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const age = calculateAge(user.dateOfBirth);

    return res.json({
      success: true,
      userData: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAccountVerified: user.isAccountVerified,
        profileCompleted: user.profileCompleted,
        gender: user.gender,
        height: user.height,
        dateOfBirth: user.dateOfBirth,
        age,
        bloodGroup: user.bloodGroup,
        activityLevel: user.activityLevel,
        dietType: user.dietType,
        smoking: user.smoking,
        alcohol: user.alcohol,
        medicalConditions: user.medicalConditions,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Complete profile after registration
export const completeProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const {
      dateOfBirth,
      gender,
      height,
      bloodGroup,
      activityLevel,
      dietType,
      smoking,
      alcohol,
      medicalConditions,
      weight,
    } = req.body;

    if (!dateOfBirth || !gender || !height || !weight) {
      return res.status(400).json({
        success: false,
        message: "dateOfBirth, gender, height, and weight are required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.profileCompleted) {
      return res.status(400).json({
        success: false,
        message:
          "Profile already completed. Use update-profile to make changes.",
      });
    }

    user.dateOfBirth = dateOfBirth;
    user.gender = gender;
    user.height = height;
    user.bloodGroup = bloodGroup;
    user.activityLevel = activityLevel;
    user.dietType = dietType;
    user.smoking = smoking ?? false;
    user.alcohol = alcohol ?? false;
    user.medicalConditions = medicalConditions || [];
    user.profileCompleted = true;

    await user.save();

    // Create first weight entry so health tracking starts immediately
    await HealthLog.create({ user: userId, weight });
    await createDefaultReminderForUser(userId);

    return res.json({
      success: true,
      message: "Profile completed successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update editable profile fields
export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const {
      height,
      bloodGroup,
      activityLevel,
      dietType,
      smoking,
      alcohol,
      medicalConditions,
    } = req.body;

    // Only include fields that were sent in the request
    const updates = {};
    if (height !== undefined) updates.height = height;
    if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup;
    if (activityLevel !== undefined) updates.activityLevel = activityLevel;
    if (dietType !== undefined) updates.dietType = dietType;
    if (smoking !== undefined) updates.smoking = smoking;
    if (alcohol !== undefined) updates.alcohol = alcohol;
    if (medicalConditions !== undefined)
      updates.medicalConditions = medicalConditions;

    // dateOfBirth and gender are intentionally not editable

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update",
      });
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select(
      "name email gender height bloodGroup activityLevel dietType smoking alcohol medicalConditions profileCompleted"
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully",
      userData: user,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
