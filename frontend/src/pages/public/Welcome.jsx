import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeartPulse,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const features = [
  "Track daily health metrics",
  "AI-powered preventive insights",
  "Upload & manage medical reports",
  "Smart medication reminders",
  "Personalized health dashboard",
];

const Welcome = () => {
  const { isLoggedIn } = useContext(AppContext);
  const navigate = useNavigate();

  const [featureIndex, setFeatureIndex] = useState(0);

  useEffect(() => {
    if (isLoggedIn) navigate("/app/dashboard");
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFeatureIndex((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen">

      {/* LEFT */}
      <div className="w-1/2 bg-gradient-to-br from-blue-600 to-indigo-800 flex flex-col justify-center items-center text-white p-10">
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          <HeartPulse size={56} className="mb-5 text-white/90" />
          <h1 className="text-5xl font-bold mb-4 text-center">
            Smart Health System
          </h1>
          <p className="text-lg text-center max-w-md opacity-90">
            Your personal health companion. Monitor, manage and improve your
            lifestyle with intelligent insights.
          </p>
        </motion.div>
      </div>

      {/* RIGHT */}
      <div className="w-1/2 flex flex-col justify-center items-center bg-gray-50 p-10 gap-8">

        {/* Cycling feature */}
        <div className="h-12 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={featureIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-xl font-medium text-gray-700 text-center flex items-center gap-2"
            >
              <CheckCircle2 size={22} className="text-blue-600 shrink-0" />
              {features[featureIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Feature dots indicator */}
        <div className="flex gap-2">
          {features.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === featureIndex ? "bg-blue-600 w-4" : "bg-gray-300 w-2"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => navigate("/login")}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-lg flex items-center gap-2"
        >
          Get Started <ArrowRight size={18} />
        </button>

      </div>
    </div>
  );
};

export default Welcome;
