import { useState, useContext, useEffect } from "react";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const CompleteProfile = () => {
  const { backendUrl, getUserData, userData } =
    useContext(AppContext);

  const navigate = useNavigate();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [loading, setLoading] = useState(false);

  // Prevent access if already completed
  useEffect(() => {
    if (userData?.profileCompleted) {
      navigate("/app/dashboard");
    }
  }, [userData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/complete-profile`,
        { age, gender, weight, height },
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

        {/* Step Indicator */}
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

          <input
            type="number"
            placeholder="Age"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
          />

          <select
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <div className="flex gap-4">
            <input
              type="number"
              placeholder="Weight (kg)"
              className="w-1/2 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />

            <input
              type="number"
              placeholder="Height (cm)"
              className="w-1/2 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition transform duration-200"
          >
            {loading ? "Saving..." : "Continue to Dashboard"}
          </button>

        </form>

      </motion.div>
    </div>
  );
};

export default CompleteProfile;