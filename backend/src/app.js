import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();

app.set("trust proxy", 1);

const parseOrigins = (value = "") =>
  value
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  ...parseOrigins(process.env.CLIENT_URL),
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.CORS_ORIGIN),
];

// Basic middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 204,
}));

app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRouter);
app.use("/api/health", healthRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/ai", aiRoutes);

// Simple health check route
app.get("/", (req, res) => {
  res.json({ success: true, message: "Smart Health API is running" });
});

// Global error handler (should be the last middleware)
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  const status = err.status || err.statusCode || 500;
  const message =
    status >= 500
      ? "Something went wrong. Please try again."
      : err.message || "Request failed";

  res.status(status).json({
    success: false,
    message,
  });
});

export default app;
