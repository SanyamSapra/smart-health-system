import { useState, useContext, useEffect } from "react";
import { AppContext } from "../../context/AppContext";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { ArrowLeft, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { saveAuthToken } from "../../services/authToken";

const VerifyEmail = () => {
  const { userData, setUserData, getUserData, logout } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  const pendingEmail =
    location.state?.email || sessionStorage.getItem("pendingSignupEmail") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (userData?.isAccountVerified) {
      navigate(userData.profileCompleted ? "/app/dashboard" : "/complete-profile", {
        replace: true,
      });
    }
  }, [userData, navigate]);

  useEffect(() => {
    if (!userData) {
      getUserData();
    }
  }, [userData, getUserData]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpBackspace = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasteData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasteData)) return;
    setOtp(pasteData.split(""));
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-account", {
        otp: otpString,
        email: pendingEmail || userData?.email,
      });

      if (data.success) {
        saveAuthToken(data.token);
        toast.success("Email verified successfully");
        sessionStorage.removeItem("pendingSignupEmail");
        const user = await getUserData();
        navigate(user?.profileCompleted ? "/app/dashboard" : "/complete-profile", {
          replace: true,
        });
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
      const { data } = await api.post("/auth/send-verify-otp", {
        email: pendingEmail || userData?.email,
      });

      if (data.success) {
        if (data.alreadyVerified) {
          toast.info("Email is already verified");
          sessionStorage.removeItem("pendingSignupEmail");
          setUserData(data.user);
          navigate(
            data.nextStep === "complete-profile" ? "/complete-profile" : "/app/dashboard",
            { replace: true }
          );
          return;
        }

        toast.success("OTP sent again");
        setOtp(["", "", "", "", "", ""]);
        setCooldown(60);
        document.getElementById("otp-0")?.focus();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleWrongEmail = async () => {
    await logout();
    sessionStorage.removeItem("pendingSignupEmail");
    navigate("/login", { replace: true, state: { mode: "signup" } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-5 shadow-xl sm:p-8"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
            <MailCheck size={28} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold text-center">Verify Your Email</h2>
          <p className="text-gray-500 text-sm mt-1 text-center">
            Enter the 6-digit OTP sent to {pendingEmail || userData?.email || "your email"}.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(e.target.value, index)}
                onKeyDown={(e) => handleOtpBackspace(e, index)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 text-center text-lg font-semibold transition-all duration-200 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:h-12"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck size={16} />
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resendLoading}
            className="text-blue-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 mx-auto"
          >
            <RefreshCw size={13} className={resendLoading ? "animate-spin" : ""} />
            {cooldown > 0
              ? `Resend OTP in ${cooldown}s`
              : resendLoading
              ? "Sending..."
              : "Resend OTP"}
          </button>

          <button
            type="button"
            onClick={handleWrongEmail}
            className="mx-auto mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-700"
          >
            <ArrowLeft size={13} />
            Wrong email? Sign up again
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
