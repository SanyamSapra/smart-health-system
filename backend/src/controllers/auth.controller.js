import crypto from "crypto";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import transporter from "../config/nodemailer.js";

// Generate OTP and store only its hash in DB
const generateOtp = () => {
  const otp = String(crypto.randomInt(100000, 999999));
  const hashed = crypto.createHash("sha256").update(otp).digest("hex");
  return { otp, hashed };
};

// Create JWT token for authentication
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Attach auth cookie to response
const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// Register new user
export const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    email = email.toLowerCase().trim();

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { otp, hashed } = generateOtp();

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isAccountVerified: false,
      verifyOtp: hashed,
      verifyOtpExpireAt: Date.now() + 10 * 60 * 1000,
    });

    await transporter.sendMail({
      from: `"Smart Health System" <${process.env.SENDER_EMAIL}>`,
      to: user.email,
      subject: "Verify Your Email",
      html: `<h2>Email Verification</h2>
             <p>Your OTP is: <b>${otp}</b></p>
             <p>This OTP expires in 10 minutes.</p>`,
    });

    const token = signToken(user._id);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAccountVerified: user.isAccountVerified,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user._id);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAccountVerified: user.isAccountVerified,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Send email verification OTP again
export const sendVerifyOtp = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (user.isAccountVerified)
      return res
        .status(400)
        .json({ success: false, message: "Account already verified" });

    const { otp, hashed } = generateOtp();

    user.verifyOtp = hashed;
    user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
    await user.save();

    await transporter.sendMail({
      from: `"Smart Health System" <${process.env.SENDER_EMAIL}>`,
      to: user.email,
      subject: "Verify Your Email",
      html: `<h2>Email Verification</h2>
             <p>Your OTP is: <b>${otp}</b></p>
             <p>This OTP expires in 10 minutes.</p>`,
    });

    return res.json({ success: true, message: "OTP sent" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Verify email using OTP
export const verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res
        .status(400)
        .json({ success: false, message: "OTP is required" });
    }

    const user = await User.findById(req.userId);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (user.verifyOtpExpireAt < Date.now())
      return res
        .status(400)
        .json({ success: false, message: "OTP expired" });

    const hashedInput = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    if (user.verifyOtp !== hashedInput)
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP" });

    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = null;

    await user.save();

    return res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Send password reset OTP
export const sendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const { otp, hashed } = generateOtp();

    user.resetOtp = hashed;
    user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000;

    await user.save();

    await transporter.sendMail({
      from: `"Smart Health System" <${process.env.SENDER_EMAIL}>`,
      to: user.email,
      subject: "Password Reset OTP",
      html: `<h2>Password Reset</h2>
             <p>Your OTP is: <b>${otp}</b></p>
             <p>This OTP expires in 10 minutes.</p>`,
    });

    return res.json({ success: true, message: "Reset OTP sent" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Verify reset OTP 
export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (user.resetOtpExpireAt < Date.now())
      return res
        .status(400)
        .json({ success: false, message: "OTP expired" });

    const hashedInput = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    if (user.resetOtp !== hashedInput)
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP" });

    return res.json({ success: true, message: "OTP verified" });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Reset password using OTP
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });

    if (newPassword.length < 6)
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (user.resetOtpExpireAt < Date.now())
      return res
        .status(400)
        .json({ success: false, message: "OTP expired" });

    const hashedInput = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    if (user.resetOtp !== hashedInput)
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = "";
    user.resetOtpExpireAt = null;

    await user.save();

    return res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Simple auth check route
export const isAuthenticated = async (req, res) => {
  return res.json({ success: true });
};