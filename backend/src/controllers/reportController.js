import mongoose from "mongoose";
import fetch from "node-fetch";
import { createPartFromBase64 } from "@google/genai";
import cloudinary from "../config/cloudinary.js";
import ai, { hasGeminiKey } from "../config/gemini.js";
import Report from "../models/Report.js";
import { getReportTips } from "../utils/healthInsights.js";

const GEMINI_MODEL = "gemini-3-flash-preview";
const ANALYSIS_CACHE_HOURS = 24;

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function getPagination(query) {
  const page = Number.parseInt(query.page, 10) || 1;
  const limit = Number.parseInt(query.limit, 10) || 10;

  return {
    page: Math.max(page, 1),
    limit: Math.min(Math.max(limit, 1), 100),
  };
}

function sendServerError(res, error, fallbackMessage = "Something went wrong. Please try again.") {
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((e) => e.message);
    return sendError(res, 400, messages[0]);
  }

  return sendError(res, 500, fallbackMessage);
}

function isValidReportId(id) {
  return mongoose.isValidObjectId(id);
}

async function findUserReport(reportId, userId) {
  return Report.findOne({ _id: reportId, user: userId });
}

function normalizeExtractedValues(extractedValues) {
  if (!extractedValues) {
    return {};
  }

  if (extractedValues instanceof Map) {
    return Object.fromEntries(extractedValues);
  }

  if (Array.isArray(extractedValues)) {
    return Object.fromEntries(extractedValues);
  }

  return extractedValues;
}

function formatReport(report) {
  if (!report) return null;
  const plainReport = report.toObject ? report.toObject() : { ...report };
  const extractedValues = normalizeExtractedValues(plainReport.extractedValues);

  return {
    ...plainReport,
    extractedValues,
    reportInsights: getReportTips(extractedValues),
  };
}

function getFileTypeFromUpload(file) {
  return file.mimetype.startsWith("image/") ? "image" : "pdf";
}

function getDownloadName(title, fileType) {
  const cleanTitle = (title || "report").replace(/[^\w\s-]/g, "").trim();
  const baseName = cleanTitle.replace(/\s+/g, "_") || "report";
  return fileType === "pdf" ? `${baseName}.pdf` : `${baseName}.jpg`;
}

async function getReportFileUrl(report) {
  if (report.fileType !== "pdf" || !report.publicId) {
    return report.fileUrl;
  }

  try {
    const fileData = await cloudinary.api.resource(report.publicId, {
      resource_type: "raw",
      type: "upload",
    });

    return fileData?.secure_url || report.fileUrl;
  } catch (error) {
    console.error("Cloudinary file lookup error:", error.message);
    return report.fileUrl;
  }
}

async function getPossibleFileUrls(report) {
  const urls = [];
  const mainUrl = await getReportFileUrl(report);

  if (mainUrl) {
    urls.push(mainUrl);
  }

  if (report.fileType === "pdf" && report.publicId) {
    const downloadUrl = cloudinary.utils.private_download_url(
      report.publicId,
      "pdf",
      {
        resource_type: "raw",
        type: "upload",
        attachment: false,
      }
    );

    if (downloadUrl && !urls.includes(downloadUrl)) {
      urls.push(downloadUrl);
    }
  }

  if (report.fileUrl && !urls.includes(report.fileUrl)) {
    urls.push(report.fileUrl);
  }

  return urls;
}

async function getReportFileResponse(report) {
  const urls = await getPossibleFileUrls(report);

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch (error) {
      console.error("Report file fetch error:", error.message);
    }
  }

  return null;
}

function getAnalysisMimeType(report, headerType) {
  if (report.fileType === "pdf") {
    return "application/pdf";
  }

  if (headerType?.startsWith("image/")) {
    return headerType;
  }

  return "image/jpeg";
}

function getSectionText(fullText, sectionName, nextSections = []) {
  const safeSectionName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const safeNextSections = nextSections.map((item) =>
    item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );

  const pattern = safeNextSections.length
    ? `${safeSectionName}:\\s*([\\s\\S]*?)(?=${safeNextSections.join("|")}:|$)`
    : `${safeSectionName}:\\s*([\\s\\S]*)$`;

  const match = fullText.match(new RegExp(pattern, "i"));
  return match?.[1]?.trim() || "";
}

function getExtractedValues(fullText) {
  const rawValues = getSectionText(fullText, "KEY_VALUES", [
    "FINDINGS",
    "RECOMMENDATIONS",
  ]);

  if (!rawValues) {
    return {};
  }

  const cleanedValues = rawValues
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const jsonMatch = cleanedValues.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return {};
  }

  try {
    const parsedValues = JSON.parse(jsonMatch[0]);
    if (parsedValues && typeof parsedValues === "object" && !Array.isArray(parsedValues)) {
      return parsedValues;
    }
  } catch {
    return {};
  }

  return {};
}

function cleanMedicalText(text) {
  return text
    .replace(/Please consult your doctor for proper medical advice\.?/gi, "")
    .trim();
}

function buildSavedSummary(summary, findings, recommendations) {
  const parts = [];

  if (summary) {
    parts.push(cleanMedicalText(summary));
  }

  if (findings) {
    parts.push(`Key Findings:\n${cleanMedicalText(findings)}`);
  }

  if (recommendations) {
    parts.push(`Recommendations:\n${cleanMedicalText(recommendations)}`);
  }

  parts.push("Please consult your doctor for proper medical advice.");

  return parts.filter(Boolean).join("\n\n");
}

function getAnalysisPrompt(reportType) {
  return `You are analyzing a medical document for a personal health monitoring app.

Analyze this ${reportType} and respond in EXACTLY this format with these exact labels:

SUMMARY: Write only 1-2 short sentences in simple language. Do not mention age or gender unless absolutely necessary. Focus only on the main takeaway.

KEY_VALUES: Extract only the most important measurable values as a JSON object. Prefer abnormal or clinically important values. Example: {"Hemoglobin": "13.2 g/dL", "Blood Pressure": "120/80 mmHg"}. If none found, write {}

FINDINGS: Write only 3-4 short bullet points for the most important abnormal or notable findings. Do not include too many normal findings. Use bullet points starting with •

RECOMMENDATIONS: Write only 2-3 short and simple actionable health tips. Use bullet points starting with •

Do not repeat the same point in multiple sections.
Do not include age, gender, or unnecessary details unless medically important.
Do not add any heading other than SUMMARY, KEY_VALUES, FINDINGS, and RECOMMENDATIONS.
Do not write the doctor disclaimer inside any section.`;
}

function getCachedAnalysis(report) {
  if (!report.aiSummary || !report.analyzedAt) {
    return null;
  }

  const hoursSinceAnalysis =
    (Date.now() - new Date(report.analyzedAt).getTime()) / (1000 * 60 * 60);

  if (hoursSinceAnalysis >= ANALYSIS_CACHE_HOURS) {
    return null;
  }

  const data = {
    summary: report.aiSummary,
    extractedValues: normalizeExtractedValues(report.extractedValues),
    cached: true,
  };

  return {
    success: true,
    ...data,
    data,
  };
}

async function getReportOrSendError(req, res) {
  const reportId = req.params.id;

  if (!isValidReportId(reportId)) {
    sendError(res, 400, "Invalid report ID");
    return null;
  }

  const report = await findUserReport(reportId, req.userId);

  if (!report) {
    sendError(res, 404, "Report not found");
    return null;
  }

  return report;
}

export const uploadReport = async (req, res) => {
  try {
    const { title, type, notes, reportDate } = req.body;

    if (!req.file) {
      return sendError(res, 400, "No file uploaded");
    }

    if (!title?.trim()) {
      return sendError(res, 400, "Report title is required");
    }

    if (reportDate && Number.isNaN(new Date(reportDate).getTime())) {
      return sendError(res, 400, "Invalid report date");
    }

    const report = await Report.create({
      user: req.userId,
      title: title.trim(),
      type: type || "Other",
      fileUrl: req.file.path,
      publicId: req.file.filename,
      fileType: getFileTypeFromUpload(req.file),
      notes: notes?.trim() || "",
      reportDate: reportDate ? new Date(reportDate) : Date.now(),
    });

    return res.status(201).json({
      success: true,
      message: "Report uploaded successfully",
      data: formatReport(report),
    });
  } catch (error) {
    return sendServerError(res, error, "Failed to upload report");
  }
};

export const getReports = async (req, res) => {
  try {
    const { page, limit } = getPagination(req.query);
    const filter = { user: req.userId };
    const total = await Report.countDocuments(filter);
    const reports = await Report.find(filter)
      .sort({ reportDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      success: true,
      count: reports.length,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: reports.map(formatReport),
    });
  } catch (error) {
    return sendServerError(res, error, "Failed to fetch reports");
  }
};

export const getReport = async (req, res) => {
  try {
    const report = await getReportOrSendError(req, res);

    if (!report) {
      return;
    }

    return res.json({
      success: true,
      data: formatReport(report),
    });
  } catch (error) {
    return sendServerError(res, error, "Failed to fetch report");
  }
};

export const viewReportFile = async (req, res) => {
  try {
    const report = await getReportOrSendError(req, res);

    if (!report) {
      return;
    }

    const fileResponse = await getReportFileResponse(report);

    if (!fileResponse) {
      return sendError(res, 400, "Unable to open this report file");
    }

    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    const contentType =
      fileResponse.headers.get("content-type") ||
      (report.fileType === "pdf" ? "application/pdf" : "image/jpeg");

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${getDownloadName(report.title, report.fileType)}"`
    );

    return res.send(fileBuffer);
  } catch (error) {
    return sendServerError(res, error, "Failed to open report file");
  }
};

export const deleteReport = async (req, res) => {
  try {
    const report = await getReportOrSendError(req, res);

    if (!report) {
      return;
    }

    await cloudinary.uploader.destroy(report.publicId, {
      resource_type: report.fileType === "pdf" ? "raw" : "image",
    });

    await report.deleteOne();

    return res.json({
      success: true,
      message: "Report deleted",
    });
  } catch (error) {
    return sendServerError(res, error, "Failed to delete report");
  }
};

export const analyzeReport = async (req, res) => {
  try {
    if (!hasGeminiKey || !ai) {
      return sendError(res, 500, "Gemini API key is missing in backend environment");
    }

    const report = await getReportOrSendError(req, res);

    if (!report) {
      return;
    }

    const cachedAnalysis = getCachedAnalysis(report);
    if (cachedAnalysis) {
      return res.json(cachedAnalysis);
    }

    const fileResponse = await getReportFileResponse(report);
    if (!fileResponse) {
      return sendError(res, 400, "Unable to read the uploaded report file for analysis");
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const base64File = Buffer.from(fileBuffer).toString("base64");
    const mimeType = getAnalysisMimeType(
      report,
      fileResponse.headers.get("content-type")
    );

    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: getAnalysisPrompt(report.type) },
            createPartFromBase64(base64File, mimeType),
          ],
        },
      ],
    });

    const responseText = result.text?.trim() || "";

    if (!responseText) {
      return sendError(res, 502, "Gemini did not return any analysis text");
    }

    const summary = getSectionText(responseText, "SUMMARY", [
      "KEY_VALUES",
      "FINDINGS",
      "RECOMMENDATIONS",
    ]);
    const findings = getSectionText(responseText, "FINDINGS", ["RECOMMENDATIONS"]);
    const recommendations = getSectionText(responseText, "RECOMMENDATIONS");
    const extractedValues = getExtractedValues(responseText);
    const savedSummary = buildSavedSummary(summary, findings, recommendations);

    report.aiSummary = savedSummary;
    report.extractedValues = new Map(Object.entries(extractedValues));
    report.analyzedAt = new Date();
    await report.save();

    const data = {
      summary: savedSummary,
      extractedValues,
      cached: false,
    };

    return res.json({
      success: true,
      ...data,
      data,
    });
  } catch (error) {
    console.error("Report analysis error:", error.message);
    return sendServerError(res, error, "Failed to analyze report");
  }
};
