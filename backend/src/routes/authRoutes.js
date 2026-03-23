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
} from "../controllers/auth.controller.js";
import userAuth from "../middlewares/userAuth.js";
import { authLimiter, otpLimiter } from "../config/rateLimiter.js";

const router = express.Router();

// Public routes — rate limited
router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, login);
router.post("/send-reset-otp", otpLimiter, sendResetOtp);
router.post("/verify-reset-otp", otpLimiter, verifyResetOtp);
router.post("/reset-password", otpLimiter, resetPassword);

// Protected routes
router.post("/logout", userAuth, logout);
router.post("/send-verify-otp", userAuth, otpLimiter, sendVerifyOtp);
router.post("/verify-account", userAuth, otpLimiter, verifyEmail);
router.get("/is-auth", userAuth, isAuthenticated);

export default router;