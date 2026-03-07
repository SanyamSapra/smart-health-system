import { useState, useRef } from "react";
import api from "../../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, KeyRound, ShieldCheck, HeartPulse, ArrowRight } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const inputRefs = useRef([]);

  /* ── STEP 1: Send OTP ───────────────────────────────────────────────────── */
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/send-reset-otp", { email });
      toast.success("OTP sent to your email");
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ── OTP input handlers ─────────────────────────────────────────────────── */
  const handleOtpChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpBackspace = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasteData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasteData)) return;
    setOtp(pasteData.split(""));
  };

  /* ── STEP 2: Verify OTP ─────────────────────────────────────────────────── */
  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (otp.join("").length !== 6) {
      toast.error("Enter the complete 6-digit OTP");
      return;
    }
    setStep(3);
  };

  /* ── STEP 3: Set new password ───────────────────────────────────────────── */
  const handleNewPasswordSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email,
        otp: otp.join(""),
        newPassword,
      });
      toast.success("Password reset successful");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  // Step indicator config
  const steps = [
    { num: 1, icon: Mail,        label: "Email" },
    { num: 2, icon: KeyRound,    label: "OTP" },
    { num: 3, icon: ShieldCheck, label: "Password" },
  ];

  return (
    <div className="min-h-screen flex">

      {/* LEFT PANEL */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-b from-blue-600 to-indigo-800 items-center justify-center">
        <div className="text-white px-12">
          <div className="flex items-center gap-3 mb-6">
            <HeartPulse size={44} className="text-white/90" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Smart Health System</h1>
          <p className="text-lg opacity-90">Secure. Reliable. Personalized.</p>
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

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-7">
            {steps.map(({ num, icon: Icon, label }, i) => (
              <div key={num} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  step === num
                    ? "bg-blue-600 text-white"
                    : step > num
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  <Icon size={12} />
                  <span>{label}</span>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight size={12} className="text-gray-300" />
                )}
              </div>
            ))}
          </div>

          {/* STEP 1 — Email */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit}>
              <h2 className="text-2xl font-semibold text-center mb-6">
                Reset Password
              </h2>
              <div className="relative mb-5">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full pl-9 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 transition text-white rounded-xl font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Mail size={15} />
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}

          {/* STEP 2 — OTP */}
          {step === 2 && (
            <form onSubmit={handleOtpSubmit}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <KeyRound size={20} className="text-blue-600" />
                <h2 className="text-2xl font-semibold text-center">Verify OTP</h2>
              </div>
              <p className="text-xs text-gray-400 text-center mb-6">
                Enter the 6-digit code sent to {email}
              </p>
              <div className="flex justify-between mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpBackspace(e, index)}
                    className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-200"
                  />
                ))}
              </div>
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 transition text-white rounded-xl font-medium flex items-center justify-center gap-2">
                <ShieldCheck size={15} /> Continue
              </button>
            </form>
          )}

          {/* STEP 3 — New Password */}
          {step === 3 && (
            <form onSubmit={handleNewPasswordSubmit}>
              <div className="flex items-center justify-center gap-2 mb-6">
                <Lock size={20} className="text-blue-600" />
                <h2 className="text-2xl font-semibold text-center">Set New Password</h2>
              </div>
              <div className="relative mb-5">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="New Password (min. 6 characters)"
                  className="w-full pl-9 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <button
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 transition text-white rounded-xl font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShieldCheck size={15} />
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