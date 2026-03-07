import mongoose from "mongoose";

const healthLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Health metrics logged by the user
    weight: {
      type: Number,
      min: [20, "Weight must be at least 20 kg"],
      max: [300, "Weight cannot exceed 300 kg"],
    },

    systolicBP: {
      type: Number,
      min: [60, "Systolic BP seems too low"],
      max: [250, "Systolic BP seems too high"],
    },

    diastolicBP: {
      type: Number,
      min: [40, "Diastolic BP seems too low"],
      max: [150, "Diastolic BP seems too high"],
    },

    sugarLevel: {
      type: Number,
      min: [30, "Blood sugar level seems too low"],
      max: [600, "Blood sugar level seems too high"],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },

    // Time when the log was recorded
    loggedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Helps fetch a user's logs quickly when sorting by date
healthLogSchema.index({ user: 1, loggedAt: -1 });

const HealthLog =
  mongoose.models.HealthLog || mongoose.model("HealthLog", healthLogSchema);

export default HealthLog;