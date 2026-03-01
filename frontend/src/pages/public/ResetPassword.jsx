import React, { useContext, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";

const ResetPassword = () => {
  const { backendUrl } = useContext(AppContext);
  axios.defaults.withCredentials = true;

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  // STEP 1: Send OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${backendUrl}/api/auth/send-reset-otp`, { email });
      setStep(2);
    } catch (error) {
      alert(error.response?.data?.message || "Error sending OTP");
    }

    setLoading(false);
  };

  // STEP 2: Move to password page
  const handleOtpSubmit = (e) => {
    e.preventDefault();
    setStep(3);
  };

  // STEP 3: Reset password
  const handleNewPasswordSubmit = async (e) => {
    e.preventDefault();

    const finalOtp = otp.join("");

    if (finalOtp.length !== 6) {
      alert("Please enter complete 6-digit OTP");
      return;
    }

    try {
      await axios.post(`${backendUrl}/api/auth/reset-password`, {
        email,
        otp: finalOtp,
        newPassword,
      });

      alert("Password Reset Successful");

      // Reset state
      setStep(1);
      setEmail("");
      setNewPassword("");
      setOtp(["", "", "", "", "", ""]);

    } catch (error) {
      alert(error.response?.data?.message || "Reset failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-200 to-purple-400">
      <div className="bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm">

        {step === 1 && (
          <form onSubmit={handleEmailSubmit}>
            <h1 className="text-white text-2xl text-center mb-4">
              Reset Password
            </h1>

            <input
              type="email"
              placeholder="Enter Email"
              className="w-full mb-4 p-2 rounded bg-[#333A5C] text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button className="w-full py-2 bg-indigo-600 rounded-full text-white">
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpSubmit}>
            <h1 className="text-white text-2xl text-center mb-4">
              Enter OTP
            </h1>

            <div className="flex justify-between mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  maxLength="1"
                  value={digit}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/, "");
                    const newOtp = [...otp];
                    newOtp[index] = value;
                    setOtp(newOtp);
                  }}
                  className="w-10 h-10 text-center bg-[#333A5C] text-white rounded"
                  required
                />
              ))}
            </div>

            <button className="w-full py-2 bg-indigo-600 rounded-full text-white">
              Continue
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleNewPasswordSubmit}>
            <h1 className="text-white text-2xl text-center mb-4">
              New Password
            </h1>

            <input
              type="password"
              placeholder="Enter New Password"
              className="w-full mb-4 p-2 rounded bg-[#333A5C] text-white"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <button className="w-full py-2 bg-indigo-600 rounded-full text-white">
              Reset Password
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default ResetPassword;