import { useEffect, useRef, useState, useMemo } from "react";
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
  Filter,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";

// ─── Constants ───────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  "Lab Report",
  "Prescription",
  "Scan / X-Ray",
  "Discharge Summary",
  "Other",
];

const TYPE_COLORS = {
  "Lab Report":         "bg-blue-50 text-blue-600 border-blue-100",
  "Prescription":       "bg-green-50 text-green-600 border-green-100",
  "Scan / X-Ray":       "bg-purple-50 text-purple-600 border-purple-100",
  "Discharge Summary":  "bg-orange-50 text-orange-600 border-orange-100",
  Other:                "bg-gray-50 text-gray-500 border-gray-100",
};

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getEmptyForm() {
  return { title: "", type: "Lab Report", notes: "", reportDate: getTodayDate(), file: null };
}

function formatReportDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
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
  return reports.filter((r) => {
    const d = new Date(r.reportDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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
    const v = parseFloat(hemoglobinItem.value);
    if (!Number.isNaN(v) && v < 12) {
      tips.push("Low hemoglobin detected. Include iron-rich foods like spinach, beans, and dates.");
    }
  }

  const sugarItem = entries.find(
    (item) => item.key.includes("sugar") || item.key.includes("glucose") || item.key.includes("hba1c")
  );
  if (sugarItem) {
    const v = parseFloat(sugarItem.value);
    if (!Number.isNaN(v)) {
      if ((sugarItem.key.includes("hba1c") && v > 6.4) || (!sugarItem.key.includes("hba1c") && v > 125)) {
        tips.push("High sugar reading found. Reduce sugar intake and prefer balanced meals.");
      }
    }
  }

  return tips;
}

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{children}</p>
);

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatItem = ({ label, value, accent }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white px-4 py-3 text-center shadow-sm">
    <p className={`text-2xl font-extrabold ${accent || "text-gray-800"}`}>{value}</p>
    <p className="mt-0.5 text-xs text-gray-400">{label}</p>
  </div>
);

// ─── Report card ──────────────────────────────────────────────────────────────
function ReportCard({ report, onView, onAnalyze, onDelete, isAnalyzing }) {
  const colorClass = TYPE_COLORS[report.type] || TYPE_COLORS.Other;
  const shortSummary =
    report.aiSummary && report.aiSummary.length > 180
      ? `${report.aiSummary.slice(0, 180)}…`
      : report.aiSummary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {/* File type icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
          {report.fileType === "pdf" ? (
            <FileText size={18} className="text-blue-600" />
          ) : (
            <ImageIcon size={18} className="text-blue-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-800">{report.title}</h3>
            <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${colorClass}`}>
              {report.type}
            </span>
          </div>

          {/* Date + analysis status */}
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar size={11} className="text-gray-300" />
              {formatReportDate(report.reportDate)}
            </span>
            {/* NEW: analyzed / not analyzed badge */}
            {report.aiSummary ? (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 size={11} /> Analyzed
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={11} /> Not analyzed
              </span>
            )}
          </div>

          {/* AI Summary snippet */}
          {shortSummary && (
            <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2">
              <p className="break-words whitespace-pre-line text-xs leading-relaxed text-blue-700">
                {shortSummary}
              </p>
            </div>
          )}

          {/* Quick tips */}
          {report.reportInsights?.length > 0 && (
            <div className="mt-2 rounded-lg bg-green-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700 mb-1">
                💡 Quick Tips
              </p>
              <div className="space-y-1">
                {report.reportInsights.slice(0, 2).map((tip) => (
                  <p key={tip} className="text-xs leading-relaxed text-green-700">{tip}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-50 pt-3">
        <button
          onClick={() => onView(report)}
          className="flex min-h-9 items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-200 active:scale-95"
        >
          <Eye size={12} /> View
        </button>

        <button
          onClick={() => onAnalyze(report)}
          disabled={isAnalyzing}
          className="flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 active:scale-95"
        >
          {isAnalyzing ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Bot size={12} />
          )}
          {isAnalyzing ? "Analyzing…" : report.aiSummary ? "Re-analyze" : "Analyze with AI"}
        </button>

        <button
          onClick={() => onDelete(report._id)}
          className="ml-auto flex min-h-9 items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-100 active:scale-95"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </motion.div>
  );
}

// ─── Report detail modal ──────────────────────────────────────────────────────
function ReportModal({ report, onClose, onAnalyze, isAnalyzing }) {
  const hasExtracted = report.extractedValues && Object.keys(report.extractedValues).length > 0;

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
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-800 leading-snug">{report.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[report.type] || TYPE_COLORS.Other}`}>
                {report.type}
              </span>
              <span className="text-xs text-gray-400">
                {formatReportDate(report.reportDate)}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-400 transition hover:text-gray-600 mt-0.5">
            <X size={20} />
          </button>
        </div>

        {/* File viewer */}
        {report.fileType === "pdf" ? (
          <a
            href={getReportViewUrl(report)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition"
          >
            <FileText size={14} /> Open PDF in new tab
          </a>
        ) : (
          <img src={getReportViewUrl(report)} alt="report" className="w-full rounded-xl border" />
        )}

        {/* Notes */}
        {report.notes && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold text-gray-500">Notes</p>
            <p className="text-sm text-gray-600">{report.notes}</p>
          </div>
        )}

        {/* AI Analysis */}
        {report.aiSummary ? (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-blue-700">
              <Bot size={13} /> AI Analysis
            </p>
            <p className="whitespace-pre-line text-xs leading-relaxed text-blue-700">
              {report.aiSummary}
            </p>
            {/* NEW: extracted values table */}
            {hasExtracted && (
              <div className="mt-3 border-t border-blue-100 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-500 mb-2">
                  Extracted Values
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(report.extractedValues).map(([key, val]) => (
                    <div key={key} className="rounded-lg bg-white/70 px-2.5 py-1.5">
                      <p className="text-[10px] text-blue-400 font-semibold capitalize">{key}</p>
                      <p className="text-xs font-bold text-blue-800">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => onAnalyze(report)}
            disabled={isAnalyzing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isAnalyzing ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
            {isAnalyzing ? "Analyzing…" : "Analyze with AI"}
          </button>
        )}

        {/* Quick tips */}
        {report.reportInsights?.length > 0 && (
          <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-4">
            <p className="mb-2 text-xs font-bold text-green-700">💡 Health Tips from This Report</p>
            <div className="space-y-2">
              {report.reportInsights.map((tip) => (
                <p key={tip} className="text-xs leading-relaxed text-green-700">{tip}</p>
              ))}
            </div>
          </div>
        )}

        {/* Re-analyze button if already analyzed */}
        {report.aiSummary && (
          <button
            onClick={() => onAnalyze(report)}
            disabled={isAnalyzing}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-200 disabled:opacity-50"
          >
            {isAnalyzing ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {isAnalyzing ? "Re-analyzing…" : "Re-analyze"}
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Reports page ────────────────────────────────────────────────────────

const Reports = () => {
  const fileInputRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);
  const [form, setForm] = useState(getEmptyForm());

  // Filter reports by type
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => { loadReports(); }, []);

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
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
    setForm((f) => ({ ...f, file: selectedFile, title: f.title || nameWithoutExt }));
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (!form.file) { toast.error("Please select a file"); return; }

    const formData = new FormData();
    formData.append("file", form.file);
    formData.append("title", form.title);
    formData.append("type", form.type);
    formData.append("notes", form.notes);
    formData.append("reportDate", form.reportDate);

    setUploading(true);
    try {
      await api.post("/reports/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Report uploaded successfully");
      setShowUpload(false);
      setForm(getEmptyForm());
      if (fileInputRef.current) fileInputRef.current.value = "";
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

      toast.success(response.data.cached ? "Showing cached analysis" : "Analysis complete");

      setReports((prev) =>
        prev.map((item) =>
          item._id === report._id ? { ...item, aiSummary: summary, extractedValues, reportInsights } : item
        )
      );
      setViewingReport((cur) => {
        if (!cur || cur._id !== report._id) return cur;
        return { ...cur, aiSummary: summary, extractedValues, reportInsights };
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Analysis failed. Please try again.");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleDelete(reportId) {
    if (!window.confirm("Delete this report? This cannot be undone.")) return;
    try {
      await api.delete(`/reports/${reportId}`);
      toast.success("Report deleted");
      setReports((prev) => prev.filter((r) => r._id !== reportId));
      setViewingReport((cur) => (cur?._id === reportId ? null : cur));
    } catch {
      toast.error("Failed to delete report");
    }
  }

  // Derived stats
  const analyzedCount = reports.filter((r) => r.aiSummary).length;
  const reportsThisMonth = countReportsThisMonth(reports);

  // Filter reports by selected type
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      return activeFilter === "All" || r.type === activeFilter;
    });
  }, [reports, activeFilter]);

  const filterOptions = ["All", ...REPORT_TYPES];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-5">

        {/* ── SECTION 1: Header ──────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <FolderOpen size={22} className="text-blue-600" />
              Medical Reports
            </h1>
            <p className="mt-0.5 text-sm text-gray-400">
              Store and analyze your prescriptions and lab reports
            </p>
          </div>
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95 shrink-0"
          >
            {showUpload ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Upload Report</>}
          </button>
        </div>

        {/* ── Upload form ────────────────────────────────────────────── */}
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
                <h2 className="text-sm font-bold text-gray-700">Upload New Report</h2>

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
                    form.file ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                >
                  <Upload size={24} className={`mx-auto mb-2 ${form.file ? "text-blue-500" : "text-gray-300"}`} />
                  {/* NEW: show file name + size if selected */}
                  {form.file ? (
                    <>
                      <p className="text-sm font-semibold text-blue-700">{form.file.name}</p>
                      <p className="mt-0.5 text-xs text-blue-400">
                        {(form.file.size / 1024).toFixed(0)} KB · Click to change
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-600">Click to select file</p>
                      <p className="mt-1 text-xs text-gray-400">JPG, PNG or PDF · Max 10 MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Report Title *</label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) => updateForm("title", e.target.value)}
                      placeholder="e.g. Blood Test Jan 2025"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Report Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => updateForm("type", e.target.value)}
                      className={INPUT_CLASS}
                    >
                      {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Report Date</label>
                    <input
                      type="date"
                      value={form.reportDate}
                      max={getTodayDate()}
                      onChange={(e) => updateForm("reportDate", e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Notes (optional)</label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(e) => updateForm("notes", e.target.value)}
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
                    <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Uploading…</>
                  ) : (
                    <><Upload size={14} /> Upload Report</>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SECTION 2: Stats bar ───────────────────────────────────── */}
        {!loading && reports.length > 0 && (
          <div>
            <SectionLabel>Overview</SectionLabel>
            <div className="grid grid-cols-3 gap-3">
              <StatItem label="Total Reports"  value={reports.length}     accent="text-gray-800" />
              <StatItem label="Analyzed"        value={analyzedCount}      accent="text-blue-600" />
              <StatItem label="This Month"      value={reportsThisMonth}   accent="text-green-600" />
            </div>
          </div>
        )}

        {/* ── SECTION 3: Filter ──────────────────────────────────────── */}
        {!loading && reports.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {filterOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setActiveFilter(opt)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  activeFilter === opt
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* ── SECTION 4: Reports list ────────────────────────────────── */}
        <div>
          {!loading && reports.length > 0 && (
            <SectionLabel>
              {filteredReports.length} Report{filteredReports.length !== 1 ? "s" : ""}
              {activeFilter !== "All" ? ` · ${activeFilter}` : ""}
            </SectionLabel>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <FolderOpen size={44} className="text-gray-200" />
              <p className="text-sm font-semibold text-gray-400">No reports uploaded yet</p>
              <p className="text-xs text-gray-300 max-w-xs">
                Upload your first prescription or lab report to store, view, and get AI-powered insights
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="mt-2 flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95"
              >
                <Plus size={14} /> Upload Report
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
            /* No results for current filter */
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Filter size={36} className="text-gray-200" />
              <p className="text-sm font-semibold text-gray-400">No reports match this filter</p>
              <button
                onClick={() => setActiveFilter("All")}
                className="mt-1 text-xs text-blue-500 hover:underline"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => (
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

      </div>

      {/* ── Detail modal ───────────────────────────────────────────────── */}
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
