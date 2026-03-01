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
    age: {
      type: Number
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"]
    },
    weight: {
      type: Number
    },
    height: {
      type: Number
    },
    profileCompleted: {
      type: Boolean,
      default: false
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
