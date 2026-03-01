import { useContext, useEffect } from "react";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const features = [
  "Track daily health metrics",
  "AI-powered preventive insights",
  "Upload & manage medical reports",
  "Smart medication reminders",
  "Personalized health dashboard"
];

const Welcome = () => {

  const { isLoggedIn } = useContext(AppContext);
  const navigate = useNavigate();

  // 🔥 If already logged in → skip welcome
  useEffect(() => {
    if (isLoggedIn) {
      navigate("/dashboard");
    }
  }, [isLoggedIn]);

  return (
    <div className="flex min-h-screen">

      {/* LEFT SIDE */}
      <div className="w-1/2 bg-gradient-to-br from-blue-600 to-indigo-800 flex flex-col justify-center items-center text-white p-10">

        <motion.h1
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1 }}
          className="text-5xl font-bold mb-4"
        >
          Smart Health System
        </motion.h1>

        <p className="text-lg text-center max-w-md">
          Your personal health companion. Monitor, manage and improve your lifestyle with intelligent insights.
        </p>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-1/2 flex flex-col justify-center items-center bg-gray-50 p-10">

        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="text-xl font-medium text-gray-700 mb-8 text-center"
        >
          {features[0]}
        </motion.div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Get Start
          </button>

        </div>

      </div>

    </div>
  );
};

export default Welcome;