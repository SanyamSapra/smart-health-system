import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["health-log", "inactivity", "medication"],
      required: true,
    },
    time: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

reminderSchema.index({ user: 1, type: 1 }, { unique: true });

const Reminder = mongoose.models.Reminder || mongoose.model("Reminder", reminderSchema);

export default Reminder;
