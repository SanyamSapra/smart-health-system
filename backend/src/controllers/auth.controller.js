import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import transporter from "../config/nodemailer.js";


export const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    email = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Send Email (WAIT for result)
    const mailOptions = {
      from: `"Smart Health System" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: "Welcome to Smart Health System",
      html: `
        <h2>Welcome to Smart Health System</h2>
        <p>Your account has been successfully created.</p>
        <p><strong>Email:</strong> ${email}</p>
        <br/>
        <p>Stay healthy</p>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent:", info.messageId);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};



export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      path: "/",
    })
    return res.json({ success: true, message: "Logged out successfully" });
  }
  catch (error) {
    return res.json({ success: false, message: error.message });
  }
}


export const sendVerifyOtp = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isAccountVerified) {
      return res.status(400).json({
        success: false,
        message: "Account already verified",
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
    await user.save();

    const mailOptions = {
      from: `"Smart Health System" <${process.env.SENDER_EMAIL}>`,
      to: user.email,
      subject: "OTP for Account Verification",
      html: `
        <h2>OTP Verification</h2>
        <p>Your OTP is: <b>${otp}</b></p>
        <p>This OTP expires in 10 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Verification OTP sent to email",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const userId = req.userId;   // from middleware
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.verifyOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (user.verifyOtpExpireAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP Expired",
      });
    }

    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


export const isAuthenticated = async(req, res) => {
  try {
    return res.json({success: true});
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
}


// SEND PASSWORD RESET OTP
export const sendResetOtp = async(req, res) => {
  const {email} = req.body;

  if(!email){
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    const user = await User.findOne({email});
    if(!user){
      return res.status(404).json({success: false, message: "User not found"})
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000;
    await user.save();
    const mailOptions = {
      from: `"Smart Health System" <${process.env.SENDER_EMAIL}>`,
      to: user.email,
      subject: "Password Reset OTP",
      html: `
        <p>Your OTP to reset password is is: <b>${otp}</b></p>
        <p>This OTP expires in 10 minutes.</p>
      `,
    }; 
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: "Password reset OTP sent to email" });

  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

// RESET USER PASSWORD
export const resetPassword = async(req, res) => {
  const {email, otp, newPassword} = req.body;
  if(!email || !otp || !newPassword){
    return res.status(400).json({ success: false, message: "Please provide all required fields" });
  }

  try {
    const user = await User.findOne({email});
    if(!user){
      return res.status(404).json({success: false, message: "User not found"});
    }
    if(user.resetOtp === "" || user.resetOtp !== otp){
      return res.status(400).json({success: false, message: "Invalid OTP"});
    }
    if(user.resetOtpExpireAt < Date.now()){
      return res.status(400).json({success: false, message: "OTP Expired"});
    }
    const hashedPassword = await(bcrypt.hash(newPassword, 10));
    user.password = hashedPassword;
    user.resetOtp = '';
    user.resetOtpExpireAt = null;
    await user.save();

    return res.status(200).json({ success: true, message: "Password reset successful" });

  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}