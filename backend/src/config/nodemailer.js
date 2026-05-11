import "./env.js";
import nodemailer from "nodemailer";

const smtpConfigured =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

if (smtpConfigured) {
  transporter.verify()
    .then(() => console.log("SMTP Server is ready"))
    .catch((err) => console.error("SMTP Error:", err.message));
} else {
  console.warn("SMTP is not configured. Email features will not work.");
}

export default transporter;
