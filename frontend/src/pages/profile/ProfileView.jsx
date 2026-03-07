import { useState, useContext, useEffect } from "react";
import { AppContext } from "../../context/AppContext";
import api from "../../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  BadgeCheck,
  BadgeAlert,
  Pencil,
  X,
  Save,
  Scale,
  HeartPulse,
  Droplets,
  Activity,
  LogOut,
  KeyRound,
  Ruler,
  Flame,
  UtensilsCrossed,
  Cigarette,
  Wine,
  Stethoscope,
} from "lucide-react";

// ── Small info row used inside sections ───────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
      <Icon size={15} className="text-gray-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-gray-700 truncate">{value || "—"}</p>
    </div>
  </div>
);

// ── Stat pill shown in the health stats row ───────────────────────────────────
const StatPill = ({ label, value, unit, color }) => (
  <div className="bg-gray-50 rounded-xl p-3 text-center">
    <p className="text-xs text-gray-400 mb-1">{label}</p>
    <p className={`text-lg font-bold ${color}`}>{value ?? "—"}</p>
    {unit && <p className="text-xs text-gray-400">{unit}</p>}
  </div>
);

// ── BMI helpers ───────────────────────────────────────────────────────────────
const getBMIInfo = (bmi) => {
  if (!bmi) return { label: null, color: "text-gray-500" };
  if (bmi < 18.5) return { label: "Underweight", color: "text-blue-500" };
  if (bmi < 25)   return { label: "Normal",      color: "text-green-500" };
  if (bmi < 30)   return { label: "Overweight",  color: "text-yellow-500" };
  return           { label: "Obese",             color: "text-red-500" };
};

// ── Calculate age from date of birth ─────────────────────────────────────────
const getAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

// =============================================================================
// MAIN PROFILE COMPONENT
// =============================================================================
const ProfileView = () => {
  const { userData, getUserData, setIsLoggedIn, setUserData } = useContext(AppContext);
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state — mirrors the updateProfile endpoint fields
  const [form, setForm] = useState({
    height: "",
    bloodGroup: "",
    activityLevel: "",
    dietType: "",
    smoking: false,
    alcohol: false,
    medicalConditions: "",
  });

  // Load latest health summary for stats section
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get("/health/latest");
        setSummary(res.data.data);
      } catch {
        // silently fail — stats just show "—"
      }
    };
    fetchSummary();
  }, []);

  // When edit mode opens, pre-fill form with current user data
  useEffect(() => {
    if (isEditing && userData) {
      setForm({
        height: userData.height || "",
        bloodGroup: userData.bloodGroup || "",
        activityLevel: userData.activityLevel || "",
        dietType: userData.dietType || "",
        smoking: userData.smoking || false,
        alcohol: userData.alcohol || false,
        medicalConditions: userData.medicalConditions?.join(", ") || "",
      });
    }
  }, [isEditing, userData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        height: form.height ? Number(form.height) : undefined,
        bloodGroup: form.bloodGroup || undefined,
        activityLevel: form.activityLevel || undefined,
        dietType: form.dietType || undefined,
        smoking: form.smoking,
        alcohol: form.alcohol,
        medicalConditions: form.medicalConditions
          ? form.medicalConditions.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      };

      const { data } = await api.put("/user/update-profile", payload);

      if (data.success) {
        toast.success("Profile updated!");
        await getUserData(); // refresh context
        setIsEditing(false);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout", {});
      setIsLoggedIn(false);
      setUserData(null);
      navigate("/login", { replace: true });
    } catch {
      toast.error("Logout failed");
    }
  };

  const age = getAge(userData?.dateOfBirth);
  const bmiInfo = getBMIInfo(summary?.bmi);

  const inputStyle = "w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300";
  const selectStyle = inputStyle;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Page title ── */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your health profile and account</p>
        </div>

        {/* ── TOP CARD: Avatar + name + email ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5"
        >
          {/* Avatar circle with first letter */}
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {userData?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-800">{userData?.name || "—"}</h2>
            <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Mail size={13} />
              {userData?.email || "—"}
            </p>

            {/* Verification badge */}
            <div className="mt-2">
              {userData?.isAccountVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                  <BadgeCheck size={13} /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full">
                  <BadgeAlert size={13} /> Email not verified
                </span>
              )}
            </div>
          </div>

          {/* Gender + age on the right */}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-700">{userData?.gender || "—"}</p>
            {age && <p className="text-xs text-gray-400 mt-0.5">{age} years old</p>}
          </div>
        </motion.div>

        {/* ── HEALTH STATS ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
        >
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Activity size={15} className="text-blue-500" />
            Health Stats
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill
              label="BMI"
              value={summary?.bmi ? `${summary.bmi} ${bmiInfo.label ? `(${bmiInfo.label})` : ""}` : null}
              color={bmiInfo.color}
            />
            <StatPill
              label="Weight"
              value={summary?.weight}
              unit="kg"
              color="text-blue-600"
            />
            <StatPill
              label="Blood Pressure"
              value={summary?.systolicBP && summary?.diastolicBP
                ? `${summary.systolicBP}/${summary.diastolicBP}` : null}
              unit="mmHg"
              color="text-red-500"
            />
            <StatPill
              label="Sugar Level"
              value={summary?.sugarLevel}
              unit="mg/dL"
              color="text-purple-600"
            />
          </div>

          <p className="text-xs text-gray-300 mt-3 text-center">
            Based on your most recent health log
          </p>
        </motion.div>

        {/* ── HEALTH PROFILE ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
        >
          {/* Section header with edit toggle */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Stethoscope size={15} className="text-blue-500" />
              Health Profile
            </h3>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
              >
                <Pencil size={12} /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
                >
                  <X size={12} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  <Save size={12} /> {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          {/* View mode */}
          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <InfoRow icon={Ruler}          label="Height"            value={userData?.height ? `${userData.height} cm` : null} />
                <InfoRow icon={HeartPulse}     label="Blood Group"       value={userData?.bloodGroup} />
                <InfoRow icon={Activity}       label="Activity Level"    value={userData?.activityLevel} />
              </div>
              <div>
                <InfoRow icon={UtensilsCrossed} label="Diet Type"        value={userData?.dietType} />
                <InfoRow icon={Cigarette}      label="Smoking"           value={userData?.smoking ? "Yes" : "No"} />
                <InfoRow icon={Wine}           label="Alcohol"           value={userData?.alcohol ? "Yes" : "No"} />
              </div>
              {userData?.medicalConditions?.length > 0 && (
                <div className="sm:col-span-2 mt-2 pt-3 border-t border-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Stethoscope size={15} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1.5">Medical Conditions</p>
                      <div className="flex flex-wrap gap-1.5">
                        {userData.medicalConditions.map((c, i) => (
                          <span key={i} className="text-xs bg-red-50 text-red-600 font-medium px-2.5 py-1 rounded-full">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Edit mode */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Height (cm)</label>
                  <input
                    type="number"
                    className={inputStyle}
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: e.target.value })}
                    min={50} max={300}
                    placeholder="e.g. 175"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Blood Group</label>
                  <select
                    className={selectStyle}
                    value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                  >
                    <option value="">Select</option>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Activity Level</label>
                  <select
                    className={selectStyle}
                    value={form.activityLevel}
                    onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}
                  >
                    <option value="">Select</option>
                    {["Sedentary", "Light", "Moderate", "Active"].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Diet Type</label>
                  <select
                    className={selectStyle}
                    value={form.dietType}
                    onChange={(e) => setForm({ ...form, dietType: e.target.value })}
                  >
                    <option value="">Select</option>
                    {["Vegetarian", "Non-Vegetarian", "Vegan"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Smoking + Alcohol toggles */}
              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.smoking}
                    onChange={(e) => setForm({ ...form, smoking: e.target.checked })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-600 font-medium">Smoking</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.alcohol}
                    onChange={(e) => setForm({ ...form, alcohol: e.target.checked })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-600 font-medium">Alcohol</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Medical Conditions (comma separated)
                </label>
                <input
                  type="text"
                  className={inputStyle}
                  value={form.medicalConditions}
                  onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })}
                  placeholder="e.g. diabetes, hypertension"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* ── ACCOUNT ACTIONS ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
        >
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <User size={15} className="text-blue-500" />
            Account
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/reset-password")}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              <KeyRound size={15} />
              Change Password
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-100 text-sm font-semibold text-red-500 hover:bg-red-50 transition"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-300 pb-2">
          Health stats are based on your most recent log and are for awareness only.
        </p>

      </div>
    </div>
  );
};

export default ProfileView;