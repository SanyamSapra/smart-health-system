import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();

// Basic middleware
app.use(
  cors({
    // Allow requests from frontend (env in production, localhost in dev)
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

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

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export default app;
