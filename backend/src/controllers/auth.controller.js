import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import transporter from "../config/nodemailer.js";

/* REGISTER USER */
export const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    email = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isAccountVerified: false,
    });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verifyOtp = otp;
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

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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

/* LOGIN */
export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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

/* LOGOUT USER */
export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "strict",
      path: "/",
    });

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

/* SEND VERIFY OTP AGAIN */
export const sendVerifyOtp = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.isAccountVerified)
      return res.status(400).json({ success: false, message: "Account already verified" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verifyOtp = otp;
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

/* VERIFY EMAIL */
export const verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.verifyOtp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    if (user.verifyOtpExpireAt < Date.now())
      return res.status(400).json({ success: false, message: "OTP expired" });

    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = null;
    await user.save();

    return res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* SEND RESET OTP */
export const sendResetOtp = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  user.resetOtp = otp;
  user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000;
  await user.save();

  await transporter.sendMail({
    from: `"Smart Health System" <${process.env.SENDER_EMAIL}>`,
    to: user.email,
    subject: "Password Reset OTP",
    html: `<h2>Password Reset</h2>
           <p>Your OTP is: <b>${otp}</b></p>`,
  });

  return res.json({ success: true, message: "Reset OTP sent" });
};

/* RESET PASSWORD */
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  if (user.resetOtp !== otp)
    return res.status(400).json({ success: false, message: "Invalid OTP" });

  if (user.resetOtpExpireAt < Date.now())
    return res.status(400).json({ success: false, message: "OTP expired" });

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetOtp = "";
  user.resetOtpExpireAt = null;
  await user.save();

  return res.json({ success: true, message: "Password reset successful" });
};

/* AUTH CHECK */
export const isAuthenticated = async (req, res) => {
  return res.json({ success: true });
};