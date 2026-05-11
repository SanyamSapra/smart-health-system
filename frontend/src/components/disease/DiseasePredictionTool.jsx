import { useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import api from "../../services/api";
import { AppContext } from "../../context/AppContext";

const SYMPTOM_GROUPS = [
  {
    title: "General",
    symptoms: [
      ["fever", "Fever"],
      ["highfever", "High fever"],
      ["mildfever", "Mild fever"],
      ["fatigue", "Fatigue"],
      ["chills", "Chills"],
      ["sweating", "Sweating"],
      ["malaise", "Malaise"],
      ["lethargy", "Lethargy"],
      ["weightloss", "Weight loss"],
      ["weightgain", "Weight gain"],
      ["lossofappetite", "Loss of appetite"],
      ["dehydration", "Dehydration"],
    ],
  },
  {
    title: "Respiratory",
    symptoms: [
      ["cough", "Cough"],
      ["breathlessness", "Breathlessness"],
      ["phlegm", "Phlegm"],
      ["mucoidsputum", "Mucus sputum"],
      ["bloodinsputum", "Blood in sputum"],
      ["chestpain", "Chest pain"],
      ["runnynose", "Runny nose"],
      ["congestion", "Congestion"],
      ["throatirritation", "Throat irritation"],
      ["rednessofeyes", "Red eyes"],
      ["sinuspressure", "Sinus pressure"],
      ["continuoussneezing", "Continuous sneezing"],
    ],
  },
  {
    title: "Digestive",
    symptoms: [
      ["nausea", "Nausea"],
      ["vomiting", "Vomiting"],
      ["abdominalpain", "Abdominal pain"],
      ["stomachpain", "Stomach pain"],
      ["bellypain", "Belly pain"],
      ["diarrhoea", "Diarrhoea"],
      ["constipation", "Constipation"],
      ["acidity", "Acidity"],
      ["indigestion", "Indigestion"],
      ["passageofgases", "Gas"],
      ["darkurine", "Dark urine"],
      ["yellowurine", "Yellow urine"],
    ],
  },
  {
    title: "Pain & Neuro",
    symptoms: [
      ["headache", "Headache"],
      ["dizziness", "Dizziness"],
      ["lossofbalance", "Loss of balance"],
      ["visualdisturbances", "Visual disturbance"],
      ["blurredanddistortedvision", "Blurred vision"],
      ["stiffneck", "Stiff neck"],
      ["backpain", "Back pain"],
      ["neckpain", "Neck pain"],
      ["jointpain", "Joint pain"],
      ["musclepain", "Muscle pain"],
      ["muscleweakness", "Muscle weakness"],
      ["weaknessinlimbs", "Weakness in limbs"],
    ],
  },
  {
    title: "Skin & Infection",
    symptoms: [
      ["itching", "Itching"],
      ["skinrash", "Skin rash"],
      ["nodalskineruptions", "Skin eruptions"],
      ["pusfilledpimples", "Pus-filled pimples"],
      ["blackheads", "Blackheads"],
      ["blister", "Blister"],
      ["redspotsoverbody", "Red spots"],
      ["yellowishskin", "Yellowish skin"],
      ["yellowingofeyes", "Yellow eyes"],
      ["swelledlymphnodes", "Swollen lymph nodes"],
      ["inflammatorynails", "Inflamed nails"],
      ["skinpeeling", "Skin peeling"],
    ],
  },
  {
    title: "Urinary & Metabolic",
    symptoms: [
      ["burningmicturition", "Burning urination"],
      ["continuousfeelofurine", "Frequent urination"],
      ["polyuria", "Polyuria"],
      ["foulsmellofurine", "Foul urine smell"],
      ["bladderdiscomfort", "Bladder discomfort"],
      ["irregularsugarlevel", "Irregular sugar"],
      ["excessivehunger", "Excessive hunger"],
      ["increasedappetite", "Increased appetite"],
      ["obesity", "Obesity"],
      ["anxiety", "Anxiety"],
      ["irritability", "Irritability"],
      ["palpitations", "Palpitations"],
    ],
  },
];

const RED_FLAG_SYMPTOMS = new Set([
  "chestpain",
  "breathlessness",
  "bloodinsputum",
  "alteredsensorium",
  "coma",
  "slurredspeech",
  "weaknessofonebodyside",
  "stomachbleeding",
  "highfever",
]);

const DURATIONS = ["Today", "2-3 days", "4-7 days", "More than a week"];
const SEVERITIES = ["Mild", "Moderate", "Severe"];

const getConfidenceTone = (confidence = 0) => {
  if (confidence >= 70) return "bg-green-500";
  if (confidence >= 40) return "bg-yellow-500";
  return "bg-red-500";
};

const DiseasePredictionTool = ({ compact = false }) => {
  const { userData } = useContext(AppContext);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [extraText, setExtraText] = useState("");
  const [search, setSearch] = useState("");
  const [duration, setDuration] = useState("2-3 days");
  const [severity, setSeverity] = useState("Moderate");
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [healthContext, setHealthContext] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadHealthContext = async () => {
      try {
        const res = await api.get("/health/latest");
        if (mounted) setHealthContext(res.data.data || null);
      } catch {
        if (mounted) setHealthContext(null);
      }
    };

    loadHealthContext();
    return () => {
      mounted = false;
    };
  }, []);

  const redFlags = selectedSymptoms.filter((item) => RED_FLAG_SYMPTOMS.has(item));
  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return compact ? SYMPTOM_GROUPS.slice(0, 4) : SYMPTOM_GROUPS;

    return SYMPTOM_GROUPS.map((group) => ({
      ...group,
      symptoms: group.symptoms.filter(([key, label]) =>
        `${key} ${label} ${group.title}`.toLowerCase().includes(term)
      ),
    })).filter((group) => group.symptoms.length);
  }, [compact, search]);

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom]
    );
  };

  const clearSelection = () => {
    setSelectedSymptoms([]);
    setExtraText("");
    setPrediction(null);
  };

  const runPrediction = async () => {
    if (!selectedSymptoms.length && !extraText.trim()) {
      toast.error("Select or describe at least one symptom");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/ai/disease-predict", {
        symptoms: selectedSymptoms,
        extraText: extraText.trim(),
        duration,
        severity,
      });
      setPrediction(res.data.data);
      toast.success("Disease prediction generated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to predict disease");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope size={17} className="text-blue-600" />
            <h2 className="text-base font-bold text-gray-800">Disease Prediction</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Model-assisted screening with symptom coverage, risk checks, and confidence ranking.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearSelection}
            className="min-h-11 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={runPrediction}
            disabled={loading}
            className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Predicting..." : "Predict"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px]">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symptoms"
            className="min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="min-h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {DURATIONS.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="min-h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {SEVERITIES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="mt-4 space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{group.title}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {group.symptoms.map(([key, label]) => {
                const active = selectedSymptoms.includes(key);
                const redFlag = RED_FLAG_SYMPTOMS.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSymptom(key)}
                    className={`flex min-h-10 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                      active
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    <span>{label}</span>
                    {redFlag && <ShieldAlert size={13} className={active ? "text-red-500" : "text-gray-300"} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <textarea
        value={extraText}
        onChange={(e) => setExtraText(e.target.value)}
        rows={compact ? 2 : 3}
        placeholder="Add symptoms not listed, triggers, medications, or context"
        className="mt-4 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />

      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Auto-used profile context</p>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-500">
            From saved profile and latest health log
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-lg bg-white p-2">
            <p className="font-semibold text-gray-400">Age / Gender</p>
            <p className="mt-1 font-bold text-gray-700">
              {userData?.age ?? "N/A"} / {userData?.gender || "N/A"}
            </p>
          </div>
          <div className="rounded-lg bg-white p-2">
            <p className="font-semibold text-gray-400">BP</p>
            <p className="mt-1 font-bold text-gray-700">
              {healthContext?.systolicBP && healthContext?.diastolicBP
                ? `${healthContext.systolicBP}/${healthContext.diastolicBP}`
                : "N/A"}
            </p>
          </div>
          <div className="rounded-lg bg-white p-2">
            <p className="font-semibold text-gray-400">Sugar / BMI</p>
            <p className="mt-1 font-bold text-gray-700">
              {healthContext?.sugarLevel ?? "N/A"} / {healthContext?.bmi ?? "N/A"}
            </p>
          </div>
          <div className="rounded-lg bg-white p-2">
            <p className="font-semibold text-gray-400">Conditions</p>
            <p className="mt-1 truncate font-bold text-gray-700">
              {userData?.medicalConditions?.length ? userData.medicalConditions.join(", ") : "None"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <CheckCircle2 size={14} /> Selected
          </div>
          <p className="mt-1 text-lg font-bold text-gray-800">{selectedSymptoms.length}</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Clock size={14} /> Duration
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-800">{duration}</p>
        </div>
        <div className={`rounded-xl p-3 ${redFlags.length ? "bg-red-50" : "bg-green-50"}`}>
          <div className={`flex items-center gap-2 text-xs font-bold ${redFlags.length ? "text-red-600" : "text-green-700"}`}>
            <AlertTriangle size={14} /> Risk Signals
          </div>
          <p className={`mt-1 text-sm font-semibold ${redFlags.length ? "text-red-700" : "text-green-700"}`}>
            {redFlags.length ? `${redFlags.length} red flag selected` : "No red flag selected"}
          </p>
        </div>
      </div>

      {redFlags.length ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert size={17} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">
              Red-flag symptoms can require urgent medical review. This tool should not delay emergency care.
            </p>
          </div>
        </div>
      ) : null}

      {prediction?.predictions?.length ? (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Top prediction</p>
              <p className="text-lg font-bold text-blue-900">
                {prediction.topDisease || prediction.predictions[0].disease}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
              <Sparkles size={13} />
              {prediction.predictionMeta?.source === "trained_model" ? "Trained model" : "Fallback rules"}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {prediction.predictions.slice(0, compact ? 3 : 5).map((item) => {
              const confidence = item.confidence ?? Math.round((item.probability || 0) * 100);
              return (
                <div key={`${item.disease}-${item.rank || confidence}`} className="rounded-xl bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-800">{item.disease}</p>
                    <p className="text-xs font-bold text-gray-500">{confidence}%</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full ${getConfidenceTone(confidence)}`}
                      style={{ width: `${Math.max(4, Math.min(100, confidence))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {prediction.predictionMeta ? (
            <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-blue-700 md:grid-cols-2">
              <div className="rounded-xl bg-white/70 p-3">
                <span className="font-bold">Matched symptoms: </span>
                {(prediction.predictionMeta.modelSymptoms || []).slice(0, 8).join(", ") || "None reported"}
              </div>
              <div className="rounded-xl bg-white/70 p-3">
                <span className="font-bold">Unmatched inputs: </span>
                {(prediction.predictionMeta.unmatchedSymptoms || []).slice(0, 8).join(", ") || "None"}
              </div>
              <div className="rounded-xl bg-white/70 p-3">
                <span className="font-bold">Context-added signals: </span>
                {(prediction.predictionMeta.contextDerivedSymptoms || []).slice(0, 8).join(", ") || "None"}
              </div>
              <div className="rounded-xl bg-white/70 p-3">
                <span className="font-bold">Context used: </span>
                Age {prediction.patientContext?.profile?.age ?? "N/A"}, {prediction.patientContext?.profile?.gender || "N/A"},
                BMI {prediction.patientContext?.latestVitals?.bmi ?? "N/A"}
              </div>
            </div>
          ) : null}

          {prediction.predictionMeta?.contextRiskSignals?.length ? (
            <div className="mt-4 space-y-2">
              {prediction.predictionMeta.contextRiskSignals.map((risk) => (
                <div
                  key={risk.message}
                  className={`rounded-xl p-3 text-xs font-semibold ${
                    risk.level === "high"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {risk.message}
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/70 p-3 text-xs text-blue-700">
            <Activity size={14} className="mt-0.5 shrink-0" />
            <p>This is a screening aid, not a diagnosis. Confirm persistent or serious symptoms with a qualified clinician.</p>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
};

export default DiseasePredictionTool;
