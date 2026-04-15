import express from "express";
import userAuth from "../middlewares/userAuth.js";
import { chatWithAssistant, getDashboardInsights } from "../controllers/aiController.js";

const router = express.Router();

router.post("/chat", userAuth, chatWithAssistant);
router.get("/insights", userAuth, getDashboardInsights);

export default router;
