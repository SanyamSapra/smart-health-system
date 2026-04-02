import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    type: {
      type: String,
      enum: [
        "Lab Report",
        "Prescription",
        "Scan / X-Ray",
        "Discharge Summary",
        "Other",
      ],
      default: "Other",
    },

    fileUrl: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
    },

    fileType: {
      type: String,
      enum: ["image", "pdf"],
      required: true,
    },

    aiSummary: {
      type: String,
      default: null,
    },

    extractedValues: {
      type: Map,
      of: String,
      default: {},
    },

    analyzedAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      maxlength: 500,
      default: "",
    },

    reportDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

reportSchema.index({ user: 1, reportDate: -1 });

const Report =
  mongoose.models.Report || mongoose.model("Report", reportSchema);

export default Report;