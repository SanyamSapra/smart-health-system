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

const sendVerificationEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"Smart Health System" <${process.env.SENDER_EMAIL}>`,
    to: email,
    subject: "Verify Your Email",
    html: `<h2>Email Verification</h2>
           <p>Your OTP is: <b>${otp}</b></p>
           <p>This OTP expires in 10 minutes.</p>`,
  });
};

// Create JWT token for authentication
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const pendingCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 10 * 60 * 1000,
  path: "/",
});

const pendingSignupKey = () =>
  crypto.createHash("sha256").update(process.env.JWT_SECRET).digest();

const encryptPendingSignup = (payload) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", pendingSignupKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
};

const decryptPendingSignup = (value) => {
  if (!value) return null;

  try {
    const [ivText, tagText, encryptedText] = value.split(".");
    if (!ivText || !tagText || !encryptedText) return null;

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      pendingSignupKey(),
      Buffer.from(ivText, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedText, "base64url")),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
};

const setPendingSignupCookie = (res, payload) => {
  res.cookie("pendingSignup", encryptPendingSignup(payload), pendingCookieOptions());
};

const clearPendingSignupCookie = (res) => {
  res.clearCookie("pendingSignup", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
};

const getLegacyUnverifiedUser = async (req) => {
  const token = req.cookies?.token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    return user && !user.isAccountVerified ? user : null;
  } catch {
    return null;
  }
};

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

    const { otp, hashed } = generateOtp();
    const pendingSignup = {
      name: name.trim(),
      email,
      password: await bcrypt.hash(password, 10),
      verifyOtp: hashed,
      verifyOtpExpireAt: Date.now() + 10 * 60 * 1000,
    };

    await sendVerificationEmail(pendingSignup.email, otp);

    setPendingSignupCookie(res, pendingSignup);

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      pendingVerification: true,
      email: pendingSignup.email,
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

    if (!user.isAccountVerified) {
      const { otp, hashed } = generateOtp();
      user.verifyOtp = hashed;
      user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
      await user.save();
      await sendVerificationEmail(user.email, otp);
    }

    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: user.isAccountVerified
        ? "Login successful"
        : "Login successful. Verification OTP sent.",
      pendingVerification: !user.isAccountVerified,
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
export const logout = (req, res) => {
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
    const pendingSignup = decryptPendingSignup(req.cookies?.pendingSignup);

    if (!pendingSignup?.email || !pendingSignup?.password || !pendingSignup?.name) {
      const legacyUser = await getLegacyUnverifiedUser(req);

      if (!legacyUser) {
        return res.status(400).json({
          success: false,
          message: "Signup session expired. Please sign up again.",
        });
      }

      const { otp, hashed } = generateOtp();
      legacyUser.verifyOtp = hashed;
      legacyUser.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
      await legacyUser.save();

      await sendVerificationEmail(legacyUser.email, otp);

      return res.json({ success: true, message: "OTP sent" });
    }

    const { otp, hashed } = generateOtp();

    pendingSignup.verifyOtp = hashed;
    pendingSignup.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;

    await sendVerificationEmail(pendingSignup.email, otp);

    setPendingSignupCookie(res, pendingSignup);

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

    const pendingSignup = decryptPendingSignup(req.cookies?.pendingSignup);

    if (!pendingSignup?.email || !pendingSignup?.password || !pendingSignup?.name) {
      const legacyUser = await getLegacyUnverifiedUser(req);

      if (!legacyUser) {
        return res.status(400).json({
          success: false,
          message: "Signup session expired. Please sign up again.",
        });
      }

      if (legacyUser.verifyOtpExpireAt < Date.now()) {
        return res.status(400).json({ success: false, message: "OTP expired" });
      }

      const hashedInput = crypto
        .createHash("sha256")
        .update(String(otp))
        .digest("hex");

      if (legacyUser.verifyOtp !== hashedInput) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }

      legacyUser.isAccountVerified = true;
      legacyUser.verifyOtp = "";
      legacyUser.verifyOtpExpireAt = null;
      await legacyUser.save();

      return res.json({
        success: true,
        message: "Email verified successfully",
        user: {
          id: legacyUser._id,
          name: legacyUser.name,
          email: legacyUser.email,
          isAccountVerified: legacyUser.isAccountVerified,
          profileCompleted: legacyUser.profileCompleted,
        },
      });
    }

    if (pendingSignup.verifyOtpExpireAt < Date.now())
      return res
        .status(400)
        .json({ success: false, message: "OTP expired" });

    const hashedInput = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    if (pendingSignup.verifyOtp !== hashedInput)
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP" });

    const existingUser = await User.findOne({ email: pendingSignup.email });
    if (existingUser) {
      clearPendingSignupCookie(res);
      return res.status(400).json({
        success: false,
        message: "User already exists. Please login.",
      });
    }

    const user = await User.create({
      name: pendingSignup.name,
      email: pendingSignup.email,
      password: pendingSignup.password,
      isAccountVerified: true,
      verifyOtp: "",
      verifyOtpExpireAt: null,
    });

    const token = signToken(user._id);
    setAuthCookie(res, token);
    clearPendingSignupCookie(res);

    return res.json({
      success: true,
      message: "Email verified successfully",
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
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (user.resetOtpExpireAt < Date.now())
      return res.status(400).json({ success: false, message: "OTP expired" });

    const hashedInput = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    if (user.resetOtp !== hashedInput)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    // Mark OTP as verified and clear it so it can't be reused
    user.resetOtpVerified = true;
    user.resetOtp = "";
    user.resetOtpExpireAt = null;
    await user.save();

    return res.json({ success: true, message: "OTP verified" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Reset password using OTP
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword)
      return res.status(400).json({
        success: false,
        message: "Email and new password are required",
      });

    if (newPassword.length < 6)
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // Check the verified flag instead of re-accepting the raw OTP
    if (!user.resetOtpVerified)
      return res.status(400).json({
        success: false,
        message: "Please verify your OTP first",
      });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtpVerified = false; // clear the flag
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
