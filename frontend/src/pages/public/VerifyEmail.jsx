import { useState, useContext, useEffect } from "react";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const VerifyEmail = () => {
  const { backendUrl, userData, getUserData } = useContext(AppContext);
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Redirect verified users away from this page
  useEffect(() => {
    if (userData?.isAccountVerified) {
      if (!userData.profileCompleted) {
        navigate("/complete-profile");
      } else {
        navigate("/dashboard");
      }
    }
  }, [userData]);

  // Countdown timer for resend button
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/auth/verify-account`,
        { otp },
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
        setCooldown(60); // 60 seconds cooldown
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

        <form onSubmit={handleVerify} className="space-y-4">

          <input
            type="text"
            maxLength={6}
            placeholder="Enter OTP"
            className="w-full p-3 border rounded-lg text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>

        </form>

        <div className="text-center mt-4">
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resendLoading}
            className="text-blue-600 text-sm"
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