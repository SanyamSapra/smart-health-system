import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Calendar,
  Eye,
  FileText,
  FolderOpen,
  ImageIcon,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";

const REPORT_TYPES = [
  "Lab Report",
  "Prescription",
  "Scan / X-Ray",
  "Discharge Summary",
  "Other",
];

const TYPE_COLORS = {
  "Lab Report": "bg-blue-50 text-blue-600",
  "Prescription": "bg-green-50 text-green-600",
  "Scan / X-Ray": "bg-purple-50 text-purple-600",
  "Discharge Summary": "bg-orange-50 text-orange-600",
  Other: "bg-gray-50 text-gray-600",
};

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getEmptyForm() {
  return {
    title: "",
    type: "Lab Report",
    notes: "",
    reportDate: getTodayDate(),
    file: null,
  };
}

function formatReportDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getReportViewUrl(report) {
  if (report.fileType === "pdf") {
    return `${import.meta.env.VITE_BACKEND_URL}/api/reports/${report._id}/file`;
  }

  return report.fileUrl;
}

function countReportsThisMonth(reports) {
  const now = new Date();

  return reports.filter((report) => {
    const reportDate = new Date(report.reportDate);
    return (
      reportDate.getMonth() === now.getMonth() &&
      reportDate.getFullYear() === now.getFullYear()
    );
  }).length;
}

function getReportInsights(extractedValues = {}) {
  const entries = Object.entries(extractedValues).map(([key, value]) => ({
    key: key.toLowerCase(),
    value: String(value).toLowerCase(),
  }));

  const tips = [];

  const hemoglobinItem = entries.find((item) => item.key.includes("hemoglobin"));
  if (hemoglobinItem) {
    const hemoglobinValue = parseFloat(hemoglobinItem.value);
    if (!Number.isNaN(hemoglobinValue) && hemoglobinValue < 12) {
      tips.push("Low hemoglobin detected. Include iron-rich foods like spinach, beans, and dates.");
    }
  }

  const sugarItem = entries.find(
    (item) =>
      item.key.includes("sugar") ||
      item.key.includes("glucose") ||
      item.key.includes("hba1c")
  );
  if (sugarItem) {
    const sugarValue = parseFloat(sugarItem.value);
    if (!Number.isNaN(sugarValue)) {
      if (
        (sugarItem.key.includes("hba1c") && sugarValue > 6.4) ||
        (!sugarItem.key.includes("hba1c") && sugarValue > 125)
      ) {
        tips.push("High sugar reading found. Reduce sugar intake and prefer balanced meals.");
      }
    }
  }

  return tips;
}

function ReportCard({ report, onView, onAnalyze, onDelete, isAnalyzing }) {
  const colorClass = TYPE_COLORS[report.type] || TYPE_COLORS.Other;
  const shortSummary =
    report.aiSummary && report.aiSummary.length > 180
      ? `${report.aiSummary.slice(0, 180)}...`
      : report.aiSummary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
          {report.fileType === "pdf" ? (
            <FileText size={18} className="text-blue-600" />
          ) : (
            <ImageIcon size={18} className="text-blue-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-800">
              {report.title}
            </h3>
            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
            >
              {report.type}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1.5">
            <Calendar size={11} className="text-gray-300" />
            <span className="text-xs text-gray-400">
              {formatReportDate(report.reportDate)}
            </span>
          </div>

          {shortSummary && (
            <div className="mt-2 rounded-lg bg-indigo-50 px-3 py-2">
              <p className="break-words whitespace-pre-line text-xs leading-relaxed text-indigo-600">
                {shortSummary}
              </p>
            </div>
          )}

          {report.reportInsights?.length > 0 && (
            <div className="mt-2 rounded-lg bg-green-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">
                Quick Tips
              </p>
              <div className="mt-1 space-y-1">
                {report.reportInsights.slice(0, 2).map((tip) => (
                  <p key={tip} className="text-xs leading-relaxed text-green-700">
                    {tip}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2 border-t border-gray-50 pt-3">
        <button
          onClick={() => onView(report)}
          className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
        >
          <Eye size={12} />
          View
        </button>

        <button
          onClick={() => onAnalyze(report)}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Bot size={12} />
          )}
          {isAnalyzing
            ? "Analyzing..."
            : report.aiSummary
              ? "Re-analyze"
              : "Analyze with AI"}
        </button>

        <button
          onClick={() => onDelete(report._id)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-100"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </motion.div>
  );
}

function ReportModal({ report, onClose, onAnalyze, isAnalyzing }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">{report.title}</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {report.type} · {formatReportDate(report.reportDate)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 transition hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {report.fileType === "pdf" ? (
          <a
            href={getReportViewUrl(report)}
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-xl bg-blue-50 py-3 text-center text-sm font-semibold text-blue-600 hover:bg-blue-100"
          >
            Open PDF
          </a>
        ) : (
          <img
            src={getReportViewUrl(report)}
            alt="report"
            className="w-full rounded-xl border"
          />
        )}

        {report.notes && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold text-gray-500">Notes</p>
            <p className="text-sm text-gray-600">{report.notes}</p>
          </div>
        )}

        {report.aiSummary ? (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-indigo-700">
              <Bot size={13} />
              AI Analysis
            </p>
            <p className="whitespace-pre-line text-xs leading-relaxed text-indigo-700">
              {report.aiSummary}
            </p>
          </div>
        ) : (
          <button
            onClick={() => onAnalyze(report)}
            disabled={isAnalyzing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Bot size={14} />
            )}
            {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
          </button>
        )}

        {report.reportInsights?.length > 0 && (
          <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-4">
            <p className="mb-2 text-xs font-bold text-green-700">Simple Report Tips</p>
            <div className="space-y-2">
              {report.reportInsights.map((tip) => (
                <p key={tip} className="text-xs leading-relaxed text-green-700">
                  {tip}
                </p>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

const Reports = () => {
  const fileInputRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);
  const [form, setForm] = useState(getEmptyForm());

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);

    try {
      const response = await api.get("/reports");
      setReports(response.data.data || []);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  function updateForm(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    const fileNameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, "");

    setForm((currentForm) => ({
      ...currentForm,
      file: selectedFile,
      title: currentForm.title || fileNameWithoutExtension,
    }));
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!form.file) {
      toast.error("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", form.file);
    formData.append("title", form.title);
    formData.append("type", form.type);
    formData.append("notes", form.notes);
    formData.append("reportDate", form.reportDate);

    setUploading(true);

    try {
      await api.post("/reports/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Report uploaded successfully");
      setShowUpload(false);
      setForm(getEmptyForm());

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadReports();
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleAnalyze(report) {
    setAnalyzingId(report._id);

    try {
      const response = await api.post(`/reports/${report._id}/analyze`);
      const summary = response.data.summary;
      const extractedValues = response.data.extractedValues || {};
      const reportInsights = getReportInsights(extractedValues);

      toast.success(
        response.data.cached ? "Showing cached analysis" : "Analysis complete"
      );

      setReports((currentReports) =>
        currentReports.map((item) =>
          item._id === report._id
            ? { ...item, aiSummary: summary, extractedValues, reportInsights }
            : item
        )
      );

      setViewingReport((currentReport) => {
        if (!currentReport || currentReport._id !== report._id) {
          return currentReport;
        }

        return {
          ...currentReport,
          aiSummary: summary,
          extractedValues,
          reportInsights,
        };
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Analysis failed. Please try again."
      );
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleDelete(reportId) {
    if (!window.confirm("Delete this report? This cannot be undone.")) {
      return;
    }

    try {
      await api.delete(`/reports/${reportId}`);
      toast.success("Report deleted");

      setReports((currentReports) =>
        currentReports.filter((report) => report._id !== reportId)
      );

      setViewingReport((currentReport) => {
        if (currentReport?._id === reportId) {
          return null;
        }

        return currentReport;
      });
    } catch {
      toast.error("Failed to delete report");
    }
  }

  const analyzedCount = reports.filter((report) => report.aiSummary).length;
  const reportsThisMonth = countReportsThisMonth(reports);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <FolderOpen size={22} className="text-blue-600" />
              Medical Reports
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Store and analyze your prescriptions and lab reports
            </p>
          </div>

          <button
            onClick={() => setShowUpload((currentValue) => !currentValue)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition active:scale-95 hover:bg-blue-700"
          >
            {showUpload ? <X size={15} /> : <Plus size={15} />}
            {showUpload ? "Cancel" : "Upload Report"}
          </button>
        </div>

        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form
                onSubmit={handleUpload}
                className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <h2 className="text-sm font-bold text-gray-700">
                  Upload New Report
                </h2>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
                    form.file
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                >
                  <Upload
                    size={24}
                    className={`mx-auto mb-2 ${
                      form.file ? "text-blue-500" : "text-gray-300"
                    }`}
                  />
                  <p className="text-sm font-medium text-gray-600">
                    {form.file ? form.file.name : "Click to select file"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    JPG, PNG or PDF · Max 10MB
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Report Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(event) => updateForm("title", event.target.value)}
                      placeholder="e.g. Blood Test Jan 2025"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Report Type
                    </label>
                    <select
                      value={form.type}
                      onChange={(event) => updateForm("type", event.target.value)}
                      className={INPUT_CLASS}
                    >
                      {REPORT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Report Date
                    </label>
                    <input
                      type="date"
                      value={form.reportDate}
                      max={getTodayDate()}
                      onChange={(event) =>
                        updateForm("reportDate", event.target.value)
                      }
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(event) => updateForm("notes", event.target.value)}
                      placeholder="Any additional notes"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading || !form.file}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Upload Report
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && reports.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Reports", value: reports.length },
              { label: "Analyzed", value: analyzedCount },
              { label: "This Month", value: reportsThisMonth },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-gray-100 bg-white p-3 text-center"
              >
                <p className="text-xl font-bold text-gray-800">{item.value}</p>
                <p className="mt-0.5 text-xs text-gray-400">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl bg-gray-200"
              />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <FolderOpen size={44} className="text-gray-200" />
            <p className="text-sm font-semibold text-gray-400">
              No reports uploaded yet
            </p>
            <p className="text-xs text-gray-300">
              Upload your first prescription or lab report to get started
            </p>
            <button
              onClick={() => setShowUpload(true)}
            className="mt-2 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={14} />
              Upload Report
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <ReportCard
                key={report._id}
                report={report}
                onView={setViewingReport}
                onAnalyze={handleAnalyze}
                onDelete={handleDelete}
                isAnalyzing={analyzingId === report._id}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewingReport && (
          <ReportModal
            report={viewingReport}
            onClose={() => setViewingReport(null)}
            onAnalyze={handleAnalyze}
            isAnalyzing={analyzingId === viewingReport._id}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reports;
