import "./env.js";
import nodemailer from "nodemailer";
import fetch from "node-fetch";

const smtpConfigured =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const brevoConfigured = Boolean(process.env.BREVO_API_KEY);

function getSender() {
  return {
    name: process.env.SENDER_NAME || "Smart Health System",
    email: process.env.SENDER_EMAIL,
  };
}

function getRecipients(to) {
  return String(to)
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendWithBrevo(mailOptions) {
  if (!process.env.SENDER_EMAIL) {
    throw new Error("SENDER_EMAIL is required to send email");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: getSender(),
      to: getRecipients(mailOptions.to),
      subject: mailOptions.subject,
      htmlContent: mailOptions.html,
      textContent: mailOptions.text,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Brevo email failed: ${details || response.statusText}`);
  }

  return response.json().catch(() => ({ success: true }));
}

const mailer = {
  sendMail(mailOptions) {
    if (brevoConfigured) {
      return sendWithBrevo(mailOptions);
    }

    if (!smtpConfigured) {
      throw new Error("Email service is not configured");
    }

    return transporter.sendMail(mailOptions);
  },
};

if (brevoConfigured) {
  console.log("Brevo email API is ready");
} else if (smtpConfigured) {
  transporter.verify()
    .then(() => console.log("SMTP Server is ready"))
    .catch((err) => console.error("SMTP Error:", err.message));
} else {
  console.warn("SMTP is not configured. Email features will not work.");
}

export default mailer;
