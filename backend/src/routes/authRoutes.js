import express from "express";
import {
  registerUser,
  login,
  logout,
  sendVerifyOtp,
  verifyEmail,
  isAuthenticated,
  sendResetOtp,
  verifyResetOtp,
  resetPassword,
  emailStatus,
} from "../controllers/auth.controller.js";
import userAuth from "../middlewares/userAuth.js";
import { authLimiter, otpLimiter } from "../config/rateLimiter.js";

const router = express.Router();

// Public routes — rate limited
router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, login);
router.post("/send-verify-otp", otpLimiter, sendVerifyOtp);
router.post("/verify-account", otpLimiter, verifyEmail);
router.post("/send-reset-otp", otpLimiter, sendResetOtp);
router.post("/verify-reset-otp", otpLimiter, verifyResetOtp);
router.post("/reset-password", otpLimiter, resetPassword);
router.get("/email-status", emailStatus);

// Protected routes
router.post("/logout", userAuth, logout);
router.get("/is-auth", userAuth, isAuthenticated);

export default router;
