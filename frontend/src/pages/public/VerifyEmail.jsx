import { useState, useContext, useEffect } from "react";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const VerifyEmail = () => {
  const { backendUrl, userData, getUserData } = useContext(AppContext);
  const navigate = useNavigate();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Redirect verified users
  useEffect(() => {
    if (userData?.isAccountVerified) {
      if (!userData.profileCompleted) {
        navigate("/complete-profile");
      } else {
        navigate("/app/dashboard");
      }
    }
  }, [userData, navigate]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Handle OTP change
  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move forward automatically
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  // Backspace navigation
  const handleOtpBackspace = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  // Paste full OTP support
  const handlePaste = (e) => {
    const pasteData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasteData)) return;

    const pasteArray = pasteData.split("");
    setOtp(pasteArray);
  };

  // Auto submit when OTP complete
  useEffect(() => {
    if (otp.every((digit) => digit !== "")) {
      handleVerify();
    }
    // eslint-disable-next-line
  }, [otp]);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/auth/verify-account`,
        { otp: otp.join("") },
        { withCredentials: true }
      );

      if (data.success) {
        toast.success("Email verified successfully");
        await getUserData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/auth/send-verify-otp`,
        {},
        { withCredentials: true }
      );

      if (data.success) {
        toast.success("OTP sent again");
        setCooldown(60);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md border border-gray-100"
      >

        <h2 className="text-2xl font-semibold mb-2 text-center">
          Verify Your Email
        </h2>

        <p className="text-gray-500 text-sm mb-6 text-center">
          Enter the 6-digit OTP sent to your email.
        </p>

        <form onSubmit={handleVerify} className="space-y-6">

          {/* OTP INPUTS */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex justify-between gap-2"
            onPaste={handlePaste}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) =>
                  handleOtpChange(e.target.value, index)
                }
                onKeyDown={(e) =>
                  handleOtpBackspace(e, index)
                }
                className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
              />
            ))}
          </motion.div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>

        </form>

        {/* RESEND SECTION */}
        <div className="text-center mt-6">
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resendLoading}
            className="text-blue-600 text-sm font-medium"
          >
            {cooldown > 0
              ? `Resend OTP in ${cooldown}s`
              : resendLoading
              ? "Sending..."
              : "Resend OTP"}
          </button>
        </div>

      </motion.div>
    </div>
  );
};

export default VerifyEmail;