import crypto from "crypto";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import transporter from "../config/nodemailer.js";

const isProduction = process.env.NODE_ENV === "production";

// Generate OTP and store only its hash in DB
const generateOtp = () => {
  const otp = String(crypto.randomInt(100000, 999999));
  const hashed = crypto.createHash("sha256").update(otp).digest("hex");
  return { otp, hashed };
};

const hashValue = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hashed: hashValue(token) };
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

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  isAccountVerified: user.isAccountVerified,
  profileCompleted: user.profileCompleted,
});

const getNextStep = (user) => {
  if (!user.isAccountVerified) return "verify-email";
  if (!user.profileCompleted) return "complete-profile";
  return "dashboard";
};

// Create JWT token for authentication
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  ...(maxAge ? { maxAge } : {}),
});

const pendingSignupKey = () =>
  crypto.createHash("sha256").update(process.env.JWT_SECRET).digest();

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

const clearPendingSignupCookie = (res) => {
  res.clearCookie("pendingSignup", cookieOptions());
};

const getUserFromToken = async (req) => {
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";
  const token = req.cookies?.token || bearerToken;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id);
  } catch {
    return null;
  }
};

const findUnverifiedUserForOtp = async (req) => {
  const email = req.body?.email?.toLowerCase()?.trim();

  if (email) {
    const user = await User.findOne({ email });
    if (user && !user.isAccountVerified) return user;
  }

  const tokenUser = await getUserFromToken(req);
  if (tokenUser && !tokenUser.isAccountVerified) return tokenUser;

  // Backward compatibility for users who started signup before this DB-first flow.
  const pendingSignup = decryptPendingSignup(req.cookies?.pendingSignup);
  if (pendingSignup?.email) {
    const user = await User.findOne({ email: pendingSignup.email });
    if (user && !user.isAccountVerified) return user;
  }

  return null;
};

// Attach auth cookie to response
const setAuthCookie = (res, token) => {
  res.cookie("token", token, cookieOptions(7 * 24 * 60 * 60 * 1000));
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

    let user = await User.findOne({ email });
    if (user?.isAccountVerified) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const { otp, hashed } = generateOtp();
    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;

    if (user) {
      user.name = name.trim();
      user.password = hashedPassword;
      user.verifyOtp = hashed;
      user.verifyOtpExpireAt = verifyOtpExpireAt;
      user.isAccountVerified = false;
      await user.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email,
        password: hashedPassword,
        isAccountVerified: false,
        verifyOtp: hashed,
        verifyOtpExpireAt,
      });
    }

    await sendVerificationEmail(user.email, otp);

    const token = signToken(user._id);
    setAuthCookie(res, token);
    clearPendingSignupCookie(res);

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      pendingVerification: true,
      nextStep: "verify-email",
      token,
      email: user.email,
      user: formatUser(user),
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

    if (!user.isAccountVerified) {
      const { otp, hashed } = generateOtp();
      user.verifyOtp = hashed;
      user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
      await user.save();
      await sendVerificationEmail(user.email, otp);
    }

    const token = signToken(user._id);
    setAuthCookie(res, token);
    clearPendingSignupCookie(res);

    return res.status(200).json({
      success: true,
      message: user.isAccountVerified
        ? "Login successful"
        : "Login successful. Verification OTP sent.",
      pendingVerification: !user.isAccountVerified,
      nextStep: getNextStep(user),
      token,
      user: formatUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Logout user
export const logout = (req, res) => {
  try {
    res.clearCookie("token", cookieOptions());
    clearPendingSignupCookie(res);

    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Send email verification OTP again
export const sendVerifyOtp = async (req, res) => {
  try {
    const email = req.body?.email?.toLowerCase()?.trim();
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser?.isAccountVerified) {
        return res.json({
          success: true,
          alreadyVerified: true,
          nextStep: getNextStep(existingUser),
          message: "Email is already verified",
          user: formatUser(existingUser),
        });
      }
    }

    const user = await findUnverifiedUserForOtp(req);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "No pending verification found. Please sign up or log in again.",
      });
    }

    const { otp, hashed } = generateOtp();

    user.verifyOtp = hashed;
    user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendVerificationEmail(user.email, otp);

    const token = signToken(user._id);
    setAuthCookie(res, token);
    clearPendingSignupCookie(res);

    return res.json({
      success: true,
      message: "OTP sent",
      token,
      email: user.email,
    });
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

    const user = await findUnverifiedUserForOtp(req);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "No pending verification found. Please sign up or log in again.",
      });
    }

    if (!user.verifyOtp || !user.verifyOtpExpireAt || user.verifyOtpExpireAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    const hashedInput = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    if (user.verifyOtp !== hashedInput) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = null;
    await user.save();

    const token = signToken(user._id);
    setAuthCookie(res, token);
    clearPendingSignupCookie(res);

    return res.json({
      success: true,
      message: "Email verified successfully",
      token,
      user: formatUser(user),
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
    user.resetOtpVerified = false;
    user.resetToken = "";

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

    if (!user.resetOtp || !user.resetOtpExpireAt || user.resetOtpExpireAt < Date.now())
      return res.status(400).json({ success: false, message: "OTP expired" });

    const hashedInput = hashValue(otp);

    if (user.resetOtp !== hashedInput)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    const { token, hashed } = generateResetToken();

    // Mark OTP as verified. Keep the expiry time so resetPassword can still enforce it.
    user.resetOtpVerified = true;
    user.resetOtp = "";
    user.resetToken = hashed;
    await user.save();

    return res.json({ success: true, message: "OTP verified", resetToken: token });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Reset password using OTP
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, resetToken } = req.body;

    if (!email || !newPassword || !resetToken)
      return res.status(400).json({
        success: false,
        message: "Email, reset token, and new password are required",
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
    if (!user.resetOtpVerified || !user.resetOtpExpireAt || !user.resetToken)
      return res.status(400).json({
        success: false,
        message: "Please verify your OTP first",
      });

    if (user.resetOtpExpireAt < Date.now()) {
      user.resetOtpVerified = false;
      user.resetOtpExpireAt = null;
      user.resetToken = "";
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP.",
      });
    }

    if (user.resetToken !== hashValue(resetToken)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset session. Please verify your OTP again.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = "";
    user.resetOtpExpireAt = null;
    user.resetOtpVerified = false;
    user.resetToken = "";
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

export const emailStatus = (req, res) => {
  return res.json({
    success: true,
    email: transporter.getStatus(),
  });
};
