import mongoose from "mongoose";

const healthLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        weight: {
            type: Number
        },

        systolicBP: {
            type: Number
        },

        diastolicBP: {
            type: Number
        },

        sugarLevel: {
            type: Number
        },

        notes: {
            type: String,
            trim: true
        },

        loggedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// Compound index for faster dashboard queries
healthLogSchema.index({ user: 1, loggedAt: -1 });

const HealthLog =
    mongoose.models.HealthLog ||
    mongoose.model("HealthLog", healthLogSchema);

export default HealthLog;