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

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", login);
router.post("/send-reset-otp", sendResetOtp);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

// Protected routes
router.post("/logout", userAuth, logout);
router.post("/send-verify-otp", userAuth, sendVerifyOtp);
router.post("/verify-account", userAuth, verifyEmail);
router.get("/is-auth", userAuth, isAuthenticated);

export default router;