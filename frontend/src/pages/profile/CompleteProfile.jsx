import { useState, useContext, useEffect } from "react";
import api from "../../services/api";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  Calendar,
  Ruler,
  Weight,
  Droplets,
  Dumbbell,
  Salad,
  Cigarette,
  Wine,
  Stethoscope,
  ArrowRight,
  UserCheck,
} from "lucide-react";

const inputStyle =
  "w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

// Label with icon used above form inputs
const FieldLabel = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
    <Icon size={13} className="text-blue-400" />
    {label}
  </div>
);

const CompleteProfile = () => {
  const { getUserData, userData } = useContext(AppContext);
  const navigate = useNavigate();

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [dietType, setDietType] = useState("");
  const [smoking, setSmoking] = useState(false);
  const [alcohol, setAlcohol] = useState(false);
  const [medicalConditions, setMedicalConditions] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect to dashboard if profile already exists
  useEffect(() => {
    if (userData?.profileCompleted) {
      navigate("/app/dashboard");
    }
  }, [userData, navigate]);

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.post("/user/complete-profile", {
        dateOfBirth,
        gender,
        height: Number(height),
        weight: Number(weight),
        bloodGroup,
        activityLevel,
        dietType,
        smoking,
        alcohol,
        medicalConditions: medicalConditions
          ? medicalConditions
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
      });

      if (data.success) {
        await getUserData();
        toast.success("Profile completed!");
        navigate("/app/dashboard");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-lg border border-gray-100"
      >
        <div className="text-sm text-blue-600 font-medium mb-2">Step 1 of 1</div>

        <div className="flex items-center gap-2 mb-2">
          <UserCheck size={22} className="text-blue-600" />
          <h2 className="text-2xl font-semibold">Complete Your Health Profile</h2>
        </div>

        <p className="text-gray-500 text-sm mb-6">
          This information helps personalize your health insights.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Date of Birth */}
          <div>
            <FieldLabel icon={Calendar} label="Date of Birth" />
            <input
              type="date"
              className={inputStyle}
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
            />

            {dateOfBirth && (
              <p className="text-sm text-gray-500 mt-1">
                Age: {calculateAge(dateOfBirth)} years
              </p>
            )}
          </div>

          {/* Gender */}
          <div>
            <FieldLabel icon={UserCheck} label="Gender" />
            <select
              className={inputStyle}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Height & Weight */}
          <div>
            <FieldLabel icon={Ruler} label="Height & Weight" />
            <div className="flex gap-4">

              <div className="relative w-full">
                <Ruler size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  placeholder="Height (cm)"
                  className="w-full pl-9 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  min="50"
                  max="300"
                  required
                />
              </div>

              <div className="relative w-full">
                <Weight size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Weight (kg)"
                  className="w-full pl-9 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  min="20"
                  max="300"
                  required
                />
              </div>

            </div>
          </div>

          {/* Blood Group */}
          <div>
            <FieldLabel icon={Droplets} label="Blood Group" />
            <select
              className={inputStyle}
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              required
            >
              <option value="">Select Blood Group</option>
              {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          {/* Activity Level */}
          <div>
            <FieldLabel icon={Dumbbell} label="Activity Level" />
            <select
              className={inputStyle}
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              required
            >
              <option value="">Activity Level</option>
              <option value="Sedentary">Sedentary</option>
              <option value="Light">Light</option>
              <option value="Moderate">Moderate</option>
              <option value="Active">Active</option>
            </select>
          </div>

          {/* Diet Type */}
          <div>
            <FieldLabel icon={Salad} label="Diet Type" />
            <select
              className={inputStyle}
              value={dietType}
              onChange={(e) => setDietType(e.target.value)}
              required
            >
              <option value="">Diet Type</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Non-Vegetarian">Non-Vegetarian</option>
              <option value="Vegan">Vegan</option>
            </select>
          </div>

          {/* Lifestyle habits */}
          <div>
            <FieldLabel icon={Cigarette} label="Lifestyle Habits" />
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={smoking}
                  onChange={(e) => setSmoking(e.target.checked)}
                  className="accent-blue-600"
                />
                <Cigarette size={14} className="text-gray-400" />
                Smoking
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={alcohol}
                  onChange={(e) => setAlcohol(e.target.checked)}
                  className="accent-blue-600"
                />
                <Wine size={14} className="text-gray-400" />
                Alcohol
              </label>
            </div>
          </div>

          {/* Medical Conditions */}
          <div>
            <FieldLabel icon={Stethoscope} label="Medical Conditions" />
            <input
              type="text"
              placeholder="e.g. diabetes, asthma (comma separated)"
              className={inputStyle}
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? "Saving..." : (
              <>
                <ArrowRight size={16} />
                Continue to Dashboard
              </>
            )}
          </button>

        </form>
      </motion.div>
    </div>
  );
};

export default CompleteProfile;