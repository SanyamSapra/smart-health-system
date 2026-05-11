import "./env.js";
import nodemailer from "nodemailer";
import fetch from "node-fetch";

const smtpConfigured =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const brevoConfigured = Boolean(process.env.BREVO_API_KEY);
const resendConfigured = Boolean(process.env.RESEND_API_KEY);
const EMAIL_TIMEOUT_MS = 12000;

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

function getRecipientEmails(to) {
  return getRecipients(to).map((recipient) => recipient.email);
}

function getSenderText() {
  const sender = getSender();
  return `${sender.name} <${sender.email}>`;
}

async function fetchWithTimeout(url, options, providerName) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`${providerName} email request timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
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

  const response = await fetchWithTimeout(
    "https://api.brevo.com/v3/smtp/email",
    {
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
    },
    "Brevo"
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Brevo email failed: ${details || response.statusText}`);
  }

  return response.json().catch(() => ({ success: true }));
}

async function sendWithResend(mailOptions) {
  if (!process.env.SENDER_EMAIL) {
    throw new Error("SENDER_EMAIL is required to send email");
  }

  const response = await fetchWithTimeout(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getSenderText(),
        to: getRecipientEmails(mailOptions.to),
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
      }),
    },
    "Resend"
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Resend email failed: ${details || response.statusText}`);
  }

  return response.json().catch(() => ({ success: true }));
}

const mailer = {
  sendMail(mailOptions) {
    if (brevoConfigured) {
      return sendWithBrevo(mailOptions);
    }

    if (resendConfigured) {
      return sendWithResend(mailOptions);
    }

    if (!smtpConfigured) {
      throw new Error("Email service is not configured");
    }

    return transporter.sendMail(mailOptions);
  },
  getStatus() {
    return {
      provider: brevoConfigured
        ? "brevo"
        : resendConfigured
        ? "resend"
        : smtpConfigured
        ? "smtp"
        : "none",
      brevoConfigured,
      resendConfigured,
      smtpConfigured: Boolean(smtpConfigured),
      senderConfigured: Boolean(process.env.SENDER_EMAIL),
    };
  },
};

if (brevoConfigured) {
  console.log("Brevo email API is ready");
} else if (resendConfigured) {
  console.log("Resend email API is ready");
} else if (smtpConfigured) {
  transporter.verify()
    .then(() => console.log("SMTP Server is ready"))
    .catch((err) => console.error("SMTP Error:", err.message));
} else {
  console.warn("SMTP is not configured. Email features will not work.");
}

export default mailer;
