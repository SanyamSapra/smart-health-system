import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";

const app = express();

// Middlewares
app.use(cors({
  origin: "http://localhost:5173", // frontend URL
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRouter);

app.use("/api/health", healthRoutes);

export default app;
  