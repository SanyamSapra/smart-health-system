import React, { useContext, useState, useRef } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const ResetPassword = () => {
  const { backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const inputRefs = useRef([]);

  /* ---------------- EMAIL STEP ---------------- */
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${backendUrl}/api/auth/send-reset-otp`, { email });
      toast.success("OTP sent to your email");
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    }
    setLoading(false);
  };

  /* ---------------- OTP HANDLING ---------------- */

  const handleOtpChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleOtpBackspace = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasteData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasteData)) return;

    const pasteArray = pasteData.split("");
    setOtp(pasteArray);
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();

    if (otp.join("").length !== 6) {
      toast.error("Enter complete 6-digit OTP");
      return;
    }

    setStep(3);
  };

  /* ---------------- NEW PASSWORD STEP ---------------- */

  const handleNewPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${backendUrl}/api/auth/reset-password`, {
        email,
        otp: otp.join(""),
        newPassword,
      });

      toast.success("Password reset successful");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Reset failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">

      {/* LEFT PANEL */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-b from-blue-600 to-indigo-800 items-center justify-center">
        <div className="text-white px-12">
          <h1 className="text-4xl font-bold mb-4">
            Smart Health System
          </h1>
          <p className="text-lg opacity-90">
            Secure. Reliable. Personalized.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-gray-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-96"
        >

          {/* STEP 1 */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit}>
              <h2 className="text-2xl font-semibold text-center mb-6">
                Reset Password
              </h2>

              <input
                type="email"
                placeholder="Email Address"
                className="w-full mb-5 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <button
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 transition text-white rounded-xl font-medium"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}

          {/* STEP 2 - MODERN OTP */}
          {step === 2 && (
            <form onSubmit={handleOtpSubmit}>
              <h2 className="text-2xl font-semibold text-center mb-6">
                Verify OTP
              </h2>

              <div
                className="flex justify-between mb-6"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) =>
                      handleOtpChange(e.target.value, index)
                    }
                    onKeyDown={(e) =>
                      handleOtpBackspace(e, index)
                    }
                    className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-200"
                  />
                ))}
              </div>

              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 transition text-white rounded-xl font-medium">
                Continue
              </button>
            </form>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <form onSubmit={handleNewPasswordSubmit}>
              <h2 className="text-2xl font-semibold text-center mb-6">
                Set New Password
              </h2>

              <input
                type="password"
                placeholder="New Password"
                className="w-full mb-5 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <button
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 transition text-white rounded-xl font-medium"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;