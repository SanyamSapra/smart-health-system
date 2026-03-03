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
      index: true
    },

    password: {
      type: String,
      required: true,
    },

    // Email Verification
    verifyOtp: {
      type: String,
      default: "",
    },
    verifyOtpExpireAt: {
      type: Date,
    },
    isAccountVerified: {
      type: Boolean,
      default: false,
    },

    // Password Reset
    resetOtp: {
      type: String,
      default: "",
    },
    resetOtpExpireAt: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"]
    },

    height: {
      type: Number
    },

    profileCompleted: {
      type: Boolean,
      default: false
    },

    dateOfBirth: {
      type: Date
    },

    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
    },

    activityLevel: {
      type: String,
      enum: ["Sedentary", "Light", "Moderate", "Active"]
    },

    dietType: {
      type: String,
      enum: ["Vegetarian", "Non-Vegetarian", "Vegan"]
    },

    smoking: {
      type: Boolean,
      default: false
    },

    alcohol: {
      type: Boolean,
      default: false
    },

    medicalConditions: [{
      type: [String],
      default: []
    }]
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
