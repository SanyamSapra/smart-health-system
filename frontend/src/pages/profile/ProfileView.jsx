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
  Activity,
  LogOut,
  KeyRound,
  Ruler,
  UtensilsCrossed,
  Cigarette,
  Wine,
  Stethoscope,
  HeartPulse,
} from "lucide-react";

// Component for showing individual profile details
const ProfileItem = ({ icon: Icon, label, value }) => (
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

// Component for the health metric boxes
const HealthCard = ({ label, value, unit, color }) => (
  <div className="bg-gray-50 rounded-xl p-3 text-center">
    <p className="text-xs text-gray-400 mb-1">{label}</p>
    <p className={`text-lg font-bold ${color}`}>{value ?? "—"}</p>
    {unit && <p className="text-xs text-gray-400">{unit}</p>}
  </div>
);

const ProfileView = () => {
  const { userData, getUserData, setIsLoggedIn, setUserData } = useContext(AppContext);
  const navigate = useNavigate();

  const [healthData, setHealthData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state for profile updates
  const [formData, setFormData] = useState({
    height: "",
    bloodGroup: "",
    activityLevel: "",
    dietType: "",
    smoking: false,
    alcohol: false,
    medicalConditions: "",
  });

  // Fetch latest health summary on mount
  useEffect(() => {
    const getHealthSummary = async () => {
      try {
        const res = await api.get("/health/latest");
        setHealthData(res.data.data);
      } catch (err) {
        console.error("Could not fetch health stats", err);
      }
    };
    getHealthSummary();
  }, []);

  // Sync form state when entering edit mode
  useEffect(() => {
    if (isEditing && userData) {
      setFormData({
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

  // BMI Label logic
  const getBmiStatus = (bmi) => {
    if (!bmi) return { label: null, color: "text-gray-500" };
    if (bmi < 18.5) return { label: "Underweight", color: "text-blue-500" };
    if (bmi < 25) return { label: "Normal", color: "text-green-500" };
    if (bmi < 30) return { label: "Overweight", color: "text-yellow-500" };
    return { label: "Obese", color: "text-red-500" };
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        height: formData.height ? Number(formData.height) : undefined,
        medicalConditions: formData.medicalConditions
          ? formData.medicalConditions.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      };

      const { data } = await api.put("/user/update-profile", payload);

      if (data.success) {
        toast.success("Profile updated successfully");
        await getUserData(); 
        setIsEditing(false);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout", {});
      setIsLoggedIn(false);
      setUserData(null);
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error("Error logging out");
    }
  };

  const age = calculateAge(userData?.dateOfBirth);
  const bmiInfo = getBmiStatus(healthData?.bmi);

  const inputClass = "w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-300 outline-none";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        
        <div>
          <h1 className="text-xl font-bold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-400">View and manage your health information</p>
        </div>

        {/* User Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5"
        >
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
            {userData?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-800">{userData?.name || "User"}</h2>
            <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-0.5">
              <Mail size={13} />
              {userData?.email}
            </div>

            <div className="mt-2">
              {userData?.isAccountVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                  <BadgeCheck size={13} /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full">
                  <BadgeAlert size={13} /> Unverified
                </span>
              )}
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-700">{userData?.gender || "—"}</p>
            {age && <p className="text-xs text-gray-400">{age} years</p>}
          </div>
        </motion.div>

        {/* Recent Stats Summary */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
        >
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Activity size={15} className="text-blue-500" />
            Latest Health Stats
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <HealthCard
              label="BMI"
              value={healthData?.bmi ? `${healthData.bmi} ${bmiInfo.label ? `(${bmiInfo.label})` : ""}` : null}
              color={bmiInfo.color}
            />
            <HealthCard
              label="Weight"
              value={healthData?.weight}
              unit="kg"
              color="text-blue-600"
            />
            <HealthCard
              label="BP"
              value={healthData?.systolicBP && healthData?.diastolicBP ? `${healthData.systolicBP}/${healthData.diastolicBP}` : null}
              unit="mmHg"
              color="text-red-500"
            />
            <HealthCard
              label="Sugar"
              value={healthData?.sugarLevel}
              unit="mg/dL"
              color="text-purple-600"
            />
          </div>
        </motion.div>

        {/* Main Profile Information */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Stethoscope size={15} className="text-blue-500" />
              Health Profile
            </h3>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg"
              >
                <Pencil size={12} /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  <Save size={12} /> {loading ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <ProfileItem icon={Ruler} label="Height" value={userData?.height ? `${userData.height} cm` : null} />
                <ProfileItem icon={HeartPulse} label="Blood Group" value={userData?.bloodGroup} />
                <ProfileItem icon={Activity} label="Activity Level" value={userData?.activityLevel} />
              </div>
              <div>
                <ProfileItem icon={UtensilsCrossed} label="Diet" value={userData?.dietType} />
                <ProfileItem icon={Cigarette} label="Smoking" value={userData?.smoking ? "Yes" : "No"} />
                <ProfileItem icon={Wine} label="Alcohol" value={userData?.alcohol ? "Yes" : "No"} />
              </div>
              {userData?.medicalConditions?.length > 0 && (
                <div className="sm:col-span-2 mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 font-medium mb-2">Medical Conditions</p>
                  <div className="flex flex-wrap gap-2">
                    {userData.medicalConditions.map((item, idx) => (
                      <span key={idx} className="text-xs bg-red-50 text-red-600 font-medium px-2.5 py-1 rounded-full">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Height (cm)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Blood Group</label>
                  <select
                    className={inputClass}
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  >
                    <option value="">Select</option>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Activity Level</label>
                  <select
                    className={inputClass}
                    value={formData.activityLevel}
                    onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value })}
                  >
                    <option value="">Select</option>
                    {["Sedentary", "Light", "Moderate", "Active"].map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Diet Type</label>
                  <select
                    className={inputClass}
                    value={formData.dietType}
                    onChange={(e) => setFormData({ ...formData, dietType: e.target.value })}
                  >
                    <option value="">Select</option>
                    {["Vegetarian", "Non-Vegetarian", "Vegan"].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.smoking}
                    onChange={(e) => setFormData({ ...formData, smoking: e.target.checked })}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-600">Smoking</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.alcohol}
                    onChange={(e) => setFormData({ ...formData, alcohol: e.target.checked })}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-600">Alcohol</span>
                </label>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Medical Conditions (comma separated)</label>
                <input
                  type="text"
                  className={inputClass}
                  value={formData.medicalConditions}
                  placeholder="e.g. Asthma, Diabetes"
                  onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Account Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <User size={15} className="text-blue-500" />
            Account Settings
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/reset-password")}
              className="flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              <KeyRound size={15} /> Change Password
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-xl border border-red-100 text-sm font-semibold text-red-500 hover:bg-red-50"
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfileView;