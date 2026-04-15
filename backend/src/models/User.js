import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
    },

    // Email verification fields
    verifyOtp: {
      type: String,
      default: "",
    },
    verifyOtpExpireAt: {
      type: Date,
      default: null,
    },
    isAccountVerified: {
      type: Boolean,
      default: false,
    },

    // Password reset fields
    resetOtp: {
      type: String,
      default: "",
    },
    resetOtpExpireAt: {
      type: Date,
      default: null,
    },
    
    resetOtpVerified: {
      type: Boolean,
      default: false,
    },

    // Profile completion flag
    profileCompleted: {
      type: Boolean,
      default: false,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },

    dateOfBirth: {
      type: Date,
    },

    height: {
      type: Number,
      min: [50, "Height seems too low"],
      max: [300, "Height seems too high"],
    },

    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
    },

    activityLevel: {
      type: String,
      enum: ["Sedentary", "Light", "Moderate", "Active"],
    },

    dietType: {
      type: String,
      enum: ["Vegetarian", "Non-Vegetarian", "Vegan"],
    },

    smoking: {
      type: Boolean,
      default: false,
    },

    alcohol: {
      type: Boolean,
      default: false,
    },

    // Stores user health conditions like diabetes, asthma etc.
    medicalConditions: {
      type: [String],
      default: [],
    },

    aiInsights: {
      insights: {
        type: [String],
        default: [],
      },
      tips: {
        type: [String],
        default: [],
      },
      warning: {
        type: String,
        default: "",
      },
      generatedAt: {
        type: Date,
        default: null,
      },
    },

    aiChatUsage: {
      date: {
        type: String,
        default: "",
      },
      count: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
