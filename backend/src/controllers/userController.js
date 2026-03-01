import User from "../models/User.js";

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
        const { age, gender, weight, height } = req.body;

        const user = await User.findById(req.userId);

        if (!user) {
            res.clearCookie("token");
            return res.status(401).json({
                success: false,
                message: "Session expired. Please login again."
            });
        }

        user.age = age;
        user.gender = gender;
        user.weight = weight;
        user.height = height;
        user.profileCompleted = true;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile completed successfully",
            profileCompleted: true
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};