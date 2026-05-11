import dotenv from "dotenv";
dotenv.config();

const hasFrontendUrl =
  process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.CORS_ORIGIN;

const requiredForProduction = [
  "MONGO_URI",
  "JWT_SECRET",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "SENDER_EMAIL",
];

if (process.env.NODE_ENV === "production") {
  const missing = requiredForProduction.filter((key) => !process.env[key]);

  if (!hasFrontendUrl) {
    missing.push("CLIENT_URL or FRONTEND_URL or CORS_ORIGIN");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
