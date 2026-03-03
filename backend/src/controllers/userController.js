import User from "../models/User.js";
import HealthLog from "../models/HealthLog.js";

export const getUserData = async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.json({
            success: true,
            userData: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAccountVerified: user.isAccountVerified,
                profileCompleted: user.profileCompleted,
                age: user.age,
                gender: user.gender,
                weight: user.weight,
                height: user.height
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


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
      weight   // 👈 initial weight
    } = req.body;

    // Basic validation
    if (!dateOfBirth || !gender || !height || !weight) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update user profile fields
    user.dateOfBirth = dateOfBirth;
    user.gender = gender;
    user.height = height;
    user.bloodGroup = bloodGroup;
    user.activityLevel = activityLevel;
    user.dietType = dietType;
    user.smoking = smoking;
    user.alcohol = alcohol;
    user.medicalConditions = medicalConditions;
    user.profileCompleted = true;

    await user.save();

    await HealthLog.create({
      user: userId,
      weight
    });

    res.json({
      success: true,
      message: "Profile completed successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};