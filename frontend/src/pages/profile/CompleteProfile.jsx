import { useState, useContext, useEffect } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const inputStyle =
  "w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

const CompleteProfile = () => {
  const { backendUrl, getUserData, userData } =
    useContext(AppContext);

  const navigate = useNavigate();

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);

  const [bloodGroup, setBloodGroup] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [dietType, setDietType] = useState("");
  const [smoking, setSmoking] = useState(false);
  const [alcohol, setAlcohol] = useState(false);
  const [medicalConditions, setMedicalConditions] = useState("");

  // Prevent access if already completed
  useEffect(() => {
    if (userData?.profileCompleted) {
      navigate("/app/dashboard");
    }
  }, [userData, navigate]);

  // Calculate age preview
  const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (
      m < 0 ||
      (m === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/complete-profile`,
        {
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
            : [],
        },
        { withCredentials: true }
      );

      if (data.success) {
        await getUserData();
        toast.success("Profile completed!");
        navigate("/app/dashboard");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message
      );
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
        <div className="text-sm text-blue-600 font-medium mb-2">
          Step 1 of 1
        </div>

        <h2 className="text-2xl font-semibold mb-2">
          Complete Your Health Profile
        </h2>

        <p className="text-gray-500 text-sm mb-6">
          This information helps us personalize your health insights.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date of Birth */}
          <div>
            <input
              type="date"
              className={inputStyle}
              value={dateOfBirth}
              onChange={(e) =>
                setDateOfBirth(e.target.value)
              }
              required
            />
            {dateOfBirth && (
              <p className="text-sm text-gray-500 mt-1">
                Age: {calculateAge(dateOfBirth)} years
              </p>
            )}
          </div>

          {/* Gender */}
          <select
            className={inputStyle}
            value={gender}
            onChange={(e) =>
              setGender(e.target.value)
            }
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          {/* Height & Weight */}
          <div className="flex gap-4">
            <input
              type="number"
              placeholder="Height (cm)"
              className={inputStyle}
              value={height}
              onChange={(e) =>
                setHeight(e.target.value)
              }
              required
            />

            <input
              type="number"
              placeholder="Weight (kg)"
              className={inputStyle}
              value={weight}
              onChange={(e) =>
                setWeight(e.target.value)
              }
              required
            />
          </div>

          {/* Blood Group */}
          <select
            className={inputStyle}
            value={bloodGroup}
            onChange={(e) =>
              setBloodGroup(e.target.value)
            }
            required
          >
            <option value="">Select Blood Group</option>
            {[
              "A+",
              "A-",
              "B+",
              "B-",
              "O+",
              "O-",
              "AB+",
              "AB-",
            ].map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>

          {/* Activity Level */}
          <select
            className={inputStyle}
            value={activityLevel}
            onChange={(e) =>
              setActivityLevel(e.target.value)
            }
            required
          >
            <option value="">Activity Level</option>
            <option value="Sedentary">Sedentary</option>
            <option value="Light">Light</option>
            <option value="Moderate">Moderate</option>
            <option value="Active">Active</option>
          </select>

          {/* Diet Type */}
          <select
            className={inputStyle}
            value={dietType}
            onChange={(e) =>
              setDietType(e.target.value)
            }
            required
          >
            <option value="">Diet Type</option>
            <option value="Vegetarian">
              Vegetarian
            </option>
            <option value="Non-Vegetarian">
              Non-Vegetarian
            </option>
            <option value="Vegan">Vegan</option>
          </select>

          {/* Smoking & Alcohol */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={smoking}
                onChange={(e) =>
                  setSmoking(e.target.checked)
                }
              />
              Smoking
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={alcohol}
                onChange={(e) =>
                  setAlcohol(e.target.checked)
                }
              />
              Alcohol
            </label>
          </div>

          {/* Medical Conditions */}
          <input
            type="text"
            placeholder="Medical Conditions (comma separated)"
            className={inputStyle}
            value={medicalConditions}
            onChange={(e) =>
              setMedicalConditions(
                e.target.value
              )
            }
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {loading
              ? "Saving..."
              : "Continue to Dashboard"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default CompleteProfile;