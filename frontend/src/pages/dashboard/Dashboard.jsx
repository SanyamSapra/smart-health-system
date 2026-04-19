import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { aggregateMetrics, aggregateBloodPressure } from "../../utils/healthUtils";
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  Tooltip, CartesianGrid,
  ResponsiveContainer,
  ReferenceLine, Legend, Cell,
} from "recharts";
import {
  AlertTriangle, Bot, Weight, Stethoscope,
  Droplets, BarChart2, TrendingUp, Plus, Upload, X, Target, Clock,
} from "lucide-react";

const formatChartDate = (value, view) => {
  const date = new Date(value);
  if (view === "daily") return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (view === "weekly") {
    const start = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((date - start) / 86400000 + start.getDay() + 1) / 7);
    return `W${weekNum}`;
  }
  if (view === "monthly") return date.toLocaleDateString("en-IN", { month: "short" });
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const getBMICategory = (bmi) => {
  if (!bmi) return null;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
};

const getBPCategory = (sys) => {
  if (!sys) return null;
  if (sys < 120) return "Normal";
  if (sys < 130) return "Elevated";
  if (sys < 140) return "High Stage 1";
  return "High Stage 2";
};

const sugarBarColor = (v) => {
  if (v >= 126) return "#f97316";
  if (v >= 100) return "#facc15";
  return "#2563eb";
};

const CustomTooltip = ({ active, payload, label, unit, mode }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-xl shadow-xl text-sm min-w-[130px]">
      <p className="text-gray-400 mb-1 text-xs">{formatChartDate(label, mode)}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: {entry.value} {unit || ""}
        </p>
      ))}
    </div>
  );
};

const TimeframeTabs = ({ value, onChange }) => (
  <div className="flex bg-gray-100 rounded-lg p-0.5">
    {["daily", "weekly", "monthly"].map((t) => (
      <button
        key={t}
        onClick={() => onChange(t)}
        className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
          value === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
        }`}
      >
        {t}
      </button>
    ))}
  </div>
);

const ChartTypeTabs = ({ value, onChange }) => (
  <div className="flex bg-gray-100 rounded-lg p-0.5">
    {[
      { key: "area", icon: <TrendingUp size={13} /> },
      { key: "bar", icon: <BarChart2 size={13} /> },
    ].map(({ key, icon }) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center justify-center ${
          value === key ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
        }`}
      >
        {icon}
      </button>
    ))}
  </div>
);

const StatCard = ({ label, value, unit, icon: Icon, bg, textColor, accentColor, sub, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="relative overflow-hidden rounded-2xl p-5 shadow-sm border border-white/60"
    style={{ background: bg }}
  >
    <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-20" style={{ background: accentColor }} />
    <div className="absolute top-4 right-4 opacity-40">
      <Icon size={22} style={{ color: accentColor }} />
    </div>
    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: textColor }}>{label}</p>
    <div className="flex items-end gap-1">
      <span className="text-3xl font-extrabold" style={{ color: accentColor }}>{value ?? "—"}</span>
      {value != null && <span className="text-sm pb-0.5 font-medium" style={{ color: textColor }}>{unit}</span>}
    </div>
    {sub && <p className="text-xs mt-1.5 font-semibold" style={{ color: accentColor }}>{sub}</p>}
  </motion.div>
);

const ChartCard = ({ title, topRight, children, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
  >
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      <div className="flex items-center gap-2">{topRight}</div>
    </div>
    {children}
  </motion.div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-52 gap-2 text-center">
    <BarChart2 className="w-10 h-10 text-gray-300" />
    <p className="text-sm font-medium text-gray-400">Start tracking today to unlock insights</p>
    <p className="text-xs text-gray-300">Your trends will appear here after a few logs</p>
  </div>
);

const Skeleton = ({ h = "h-52" }) => (
  <div className={`animate-pulse rounded-xl bg-gray-100 ${h}`} />
);

const QuickAction = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 active:scale-95"
  >
    <Icon size={15} />
    {label}
  </button>
);

const HealthStatusBadge = ({ status }) => {
  const cls =
    status === "Good" ? "bg-green-50 text-green-700 border-green-200" :
    status === "High Risk" ? "bg-red-50 text-red-700 border-red-200" :
    "bg-yellow-50 text-yellow-700 border-yellow-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {status || "Needs Attention"}
    </span>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [weightTimeframe, setWeightTimeframe] = useState("daily");
  const [weightChartType, setWeightChartType] = useState("bar");
  const [bpTimeframe, setBpTimeframe] = useState("daily");
  const [bpChartType, setBpChartType] = useState("bar");
  const [sugarTimeframe, setSugarTimeframe] = useState("daily");
  const [sugarChartType, setSugarChartType] = useState("bar");

  const [form, setForm] = useState({
    weight: "", systolicBP: "", diastolicBP: "", sugarLevel: "", notes: "",
  });

  useEffect(() => {
    fetchSummary();
    fetchHistory();
    fetchInsights();
  }, []);

  const prefillDone = useRef(false);
  useEffect(() => {
    if (summary && !prefillDone.current) {
      prefillDone.current = true;
      setForm({
        weight: summary.weight || "",
        systolicBP: summary.systolicBP || "",
        diastolicBP: summary.diastolicBP || "",
        sugarLevel: summary.sugarLevel || "",
        notes: "",
      });
    }
  }, [summary]);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get("/health/latest");
      setSummary(res.data.data);
      setLastUpdated(new Date());
    } catch {
      toast.error("Failed to load summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/health/history?days=90");
      setHistory(res.data.data || []);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await api.get("/ai/insights");
      setInsights(res.data.data);
    } catch {
      toast.error("Failed to load AI insights");
    } finally {
      setInsightsLoading(false);
    }
  };

  const addLog = async () => {
    const payload = {
      weight: form.weight ? Number(form.weight) : undefined,
      systolicBP: form.systolicBP ? Number(form.systolicBP) : undefined,
      diastolicBP: form.diastolicBP ? Number(form.diastolicBP) : undefined,
      sugarLevel: form.sugarLevel ? Number(form.sugarLevel) : undefined,
      notes: form.notes || undefined,
    };
    if (!payload.weight && !payload.systolicBP && !payload.diastolicBP && !payload.sugarLevel) {
      toast.error("Please enter at least one metric");
      return;
    }
    setSubmitLoading(true);
    try {
      await api.post("/health/add-log", payload);
      toast.success("Health log saved!");
      setForm({ weight: "", systolicBP: "", diastolicBP: "", sugarLevel: "", notes: "" });
      setShowForm(false);
      fetchSummary();
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save log");
    } finally {
      setSubmitLoading(false);
    }
  };

  const weightData = useMemo(() => aggregateMetrics(history, weightTimeframe, "weight"), [history, weightTimeframe]);
  const sugarData  = useMemo(() => aggregateMetrics(history, sugarTimeframe, "sugarLevel"), [history, sugarTimeframe]);
  const bpData     = useMemo(() => aggregateBloodPressure(history, bpTimeframe), [history, bpTimeframe]);

  const showBPAlert = summary?.systolicBP >= 140;
  const showBSAlert = summary?.sugarLevel >= 200;

  // Build Today's Focus points (max 2)
  const focusPoints = [];
  if (!summaryLoading) {
    if (!summary?.loggedToday) {
      focusPoints.push({ icon: "📋", text: "Log your health today to keep your streak and track trends accurately.", color: "bg-blue-50 text-blue-700" });
    }
    if (summary?.systolicBP >= 140) {
      focusPoints.push({ icon: "🫀", text: "Your BP is high — reduce salt intake, stay hydrated, and avoid stress today.", color: "bg-red-50 text-red-700" });
    } else if (summary?.sugarLevel >= 126) {
      focusPoints.push({ icon: "🩸", text: "Blood sugar is elevated — avoid sugary drinks and go for a short walk.", color: "bg-orange-50 text-orange-700" });
    }
    if (focusPoints.length === 0) {
      focusPoints.push({ icon: "✅", text: "All readings look healthy today. Stay active and keep logging consistently.", color: "bg-green-50 text-green-700" });
    }
  }

  const renderWeightChart = () => {
    if (!weightData.length) return <EmptyState />;
    const tickFmt = (d) => formatChartDate(d, weightTimeframe);
    if (weightChartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weightData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip unit="kg" mode={weightTimeframe} />} />
            <Bar dataKey="avg" name="Avg Weight" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {weightData.map((_, i) => <Cell key={i} fill="#3b82f6" fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={weightData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip unit="kg" mode={weightTimeframe} />} />
          <Area type="monotone" dataKey="avg" name="Weight" stroke="#3b82f6" strokeWidth={2.5}
            fill="url(#weightGradient)" dot={{ r: 4, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderBPChart = () => {
    if (!bpData.length) return <EmptyState />;
    const tickFmt = (d) => formatChartDate(d, bpTimeframe);
    if (bpChartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={bpData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip unit="mmHg" mode={bpTimeframe} />} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8, color: "#64748b" }} />
            <ReferenceLine y={120} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1.5} />
            <ReferenceLine y={140} stroke="#f97316" strokeDasharray="4 3" strokeWidth={1.5} />
            <Bar dataKey="systolicBP" name="Systolic" radius={[4, 4, 0, 0]} maxBarSize={20} fill="#f43f5e" fillOpacity={0.85} />
            <Bar dataKey="diastolicBP" name="Diastolic" radius={[4, 4, 0, 0]} maxBarSize={20} fill="#fb923c" fillOpacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={bpData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip unit="mmHg" mode={bpTimeframe} />} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8, color: "#64748b" }} />
          <ReferenceLine y={120} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: "Normal", position: "insideTopRight", fontSize: 9, fill: "#22c55e" }} />
          <ReferenceLine y={140} stroke="#f97316" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: "High", position: "insideTopRight", fontSize: 9, fill: "#f97316" }} />
          <Line type="monotone" dataKey="systolicBP" name="Systolic" stroke="#f43f5e" strokeWidth={2.5}
            dot={{ r: 4, fill: "#f43f5e", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="diastolicBP" name="Diastolic" stroke="#fb923c" strokeWidth={2.5}
            dot={{ r: 4, fill: "#fb923c", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderSugarChart = () => {
    if (!sugarData.length) return <EmptyState />;
    const tickFmt = (d) => formatChartDate(d, sugarTimeframe);
    if (sugarChartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sugarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip unit="mg/dL" mode={sugarTimeframe} />} />
            <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1.5} />
            <ReferenceLine y={126} stroke="#f97316" strokeDasharray="4 3" strokeWidth={1.5} />
            <Bar dataKey="avg" name="Avg Sugar" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {sugarData.map((entry, i) => (
                <Cell key={i} fill={sugarBarColor(entry.avg)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={sugarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="sugarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip unit="mg/dL" mode={sugarTimeframe} />} />
          <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: "Normal", position: "insideTopRight", fontSize: 9, fill: "#22c55e" }} />
          <ReferenceLine y={126} stroke="#f97316" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: "Pre-diabetic", position: "insideTopRight", fontSize: 9, fill: "#f97316" }} />
          <Area type="monotone" dataKey="avg" name="Sugar Level" stroke="#2563eb" strokeWidth={2.5}
            fill="url(#sugarGradient)" dot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium mb-0.5">
              {summary?.userName
                ? `Hi ${summary.userName}, here's your health overview today`
                : "Here's your health overview today"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800">Health Dashboard</h1>
              {!summaryLoading && <HealthStatusBadge status={summary?.healthStatus} />}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <p className="text-gray-500 text-sm">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              {lastUpdated && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={11} />
                  Last updated: {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95 shrink-0"
          >
            {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add Log</>}
          </button>
        </div>

        {/* Abnormal reading alert */}
        <AnimatePresence>
          {(showBPAlert || showBSAlert) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
            >
              <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-700 text-sm">Abnormal Reading Detected</p>
                <p className="text-red-500 text-xs mt-0.5">
                  {showBPAlert && "Blood pressure ≥ 140 mmHg. "}
                  {showBSAlert && "Blood sugar ≥ 200 mg/dL. "}
                  This is not a diagnosis — please consult a healthcare professional.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add log form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-4">Log Health Metrics</h2>
                <div className="grid grid-cols-1 gap-3 mb-3 sm:grid-cols-2 md:grid-cols-4">
                  {[
                    { key: "weight", placeholder: "Weight (kg)", min: 20, max: 300 },
                    { key: "systolicBP", placeholder: "Systolic BP", min: 60, max: 250 },
                    { key: "diastolicBP", placeholder: "Diastolic BP", min: 40, max: 150 },
                    { key: "sugarLevel", placeholder: "Sugar (mg/dL)", min: 30, max: 600 },
                  ].map(({ key, placeholder, min, max }) => (
                    <input
                      key={key}
                      type="number"
                      placeholder={placeholder}
                      value={form[key]}
                      min={min}
                      max={max}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="min-h-11 rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mb-4 min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  onClick={addLog}
                  disabled={submitLoading}
                  className="min-h-11 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitLoading ? "Saving..." : "Save Log"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {summaryLoading ? (
            Array(5).fill(0).map((_, i) => <div key={i} className="h-28 rounded-2xl animate-pulse bg-gray-200" />)
          ) : (
            <>
              <StatCard delay={0.05} label="Weight" icon={Weight} value={summary?.weight} unit="kg"
                bg="linear-gradient(135deg, #eff6ff, #dbeafe)" textColor="#3b82f6" accentColor="#1d4ed8" />
              <StatCard delay={0.1} label="Blood Pressure" icon={Stethoscope}
                value={summary?.systolicBP && summary?.diastolicBP ? `${summary.systolicBP}/${summary.diastolicBP}` : null}
                unit="mmHg" sub={getBPCategory(summary?.systolicBP) ? `● ${getBPCategory(summary?.systolicBP)}` : null}
                bg="linear-gradient(135deg, #fff1f2, #fecdd3)" textColor="#f43f5e" accentColor="#be123c" />
              <StatCard delay={0.15} label="Sugar Level" icon={Droplets} value={summary?.sugarLevel} unit="mg/dL"
                bg="linear-gradient(135deg, #eff6ff, #dbeafe)" textColor="#3b82f6" accentColor="#1d4ed8" />
              <StatCard delay={0.2} label="BMI" icon={BarChart2} value={summary?.bmi}
                sub={getBMICategory(summary?.bmi) ? `● ${getBMICategory(summary?.bmi)}` : null}
                bg="linear-gradient(135deg, #f0fdf4, #dcfce7)" textColor="#22c55e" accentColor="#15803d" />
              <StatCard delay={0.25} label="Health Score" icon={TrendingUp} value={summary?.healthScore?.score}
                sub={summary?.healthScore?.status ? `● ${summary.healthScore.status}` : null}
                bg="linear-gradient(135deg, #fff7ed, #ffedd5)" textColor="#f97316" accentColor="#c2410c" />
            </>
          )}
        </div>

        {/* Quick actions + streak */}
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-gray-800">You logged {summary?.streak || 0} days this week</p>
            <p className="mt-1 text-xs text-gray-500">Keep a simple streak for better weekly trends.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <QuickAction icon={Plus}   label="Add Log"       onClick={() => setShowForm(true)} />
            <QuickAction icon={Upload} label="Upload Report" onClick={() => navigate("/app/reports")} />
            <QuickAction icon={Bot}    label="Ask AI"        onClick={() => navigate("/app/chatbot")} />
          </div>
        </div>

        {/* Today's Focus */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-gray-700">Today's Focus</h3>
          </div>
          {summaryLoading ? (
            <Skeleton h="h-14" />
          ) : (
            <div className="space-y-2">
              {focusPoints.slice(0, 2).map((p, i) => (
                <div key={i} className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm ${p.color}`}>
                  <span className="shrink-0">{p.icon}</span>
                  <p>{p.text}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* AI Insights + Trend Detection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-gray-700">Trend Detection</h3>
            </div>
            {summary?.trends?.length ? (
              <div className="space-y-2">
                {summary.trends.map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
                    <span className="shrink-0">📈</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Add more logs to see simple health trends.</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Bot size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-gray-700">Smart Insights</h3>
            </div>
            {insightsLoading ? (
              <Skeleton h="h-40" />
            ) : (
              <div className="space-y-2">
                {(insights?.insights || []).map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
                    <span className="shrink-0">💡</span>
                    <span>{item}</span>
                  </div>
                ))}
                {(insights?.tips || []).map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
                    <span className="shrink-0">✅</span>
                    <span>{item}</span>
                  </div>
                ))}
                {insights?.warning && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    <span className="shrink-0">⚠️</span>
                    <span>{insights.warning}</span>
                  </div>
                )}
                {!insights?.insights?.length && !insights?.tips?.length && !insights?.warning && (
                  <p className="text-sm text-gray-400">No insights yet. Log more data to generate AI insights.</p>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Weight"
            delay={0.25}
            topRight={
              <>
                <TimeframeTabs value={weightTimeframe} onChange={setWeightTimeframe} />
                <ChartTypeTabs value={weightChartType} onChange={setWeightChartType} />
              </>
            }
          >
            {historyLoading ? <Skeleton /> : renderWeightChart()}
          </ChartCard>

          <ChartCard
            title="Blood Pressure"
            delay={0.3}
            topRight={
              <>
                <TimeframeTabs value={bpTimeframe} onChange={setBpTimeframe} />
                <ChartTypeTabs value={bpChartType} onChange={setBpChartType} />
              </>
            }
          >
            {historyLoading ? <Skeleton /> : renderBPChart()}
          </ChartCard>
        </div>

        <ChartCard
          title="Blood Sugar"
          delay={0.35}
          topRight={
            <>
              <TimeframeTabs value={sugarTimeframe} onChange={setSugarTimeframe} />
              <ChartTypeTabs value={sugarChartType} onChange={setSugarChartType} />
            </>
          }
        >
          {historyLoading ? <Skeleton h="h-44" /> : renderSugarChart()}
        </ChartCard>

      </div>
    </div>
  );
};

export default Dashboard;