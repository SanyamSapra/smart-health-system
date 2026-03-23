import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 requests per window
  message: {
    success: false,
    message: "Too many attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // max 5 OTP attempts per window
  message: {
    success: false,
    message: "Too many OTP attempts. Please try again after 10 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});