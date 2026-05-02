import express from "express";
import userAuth from "../middlewares/userAuth.js";
import {
  chatWithAssistant,
  getDashboardInsights,
  predictDisease,
} from "../controllers/aiController.js";

const router = express.Router();

router.post("/chat", userAuth, chatWithAssistant);
router.get("/insights", userAuth, getDashboardInsights);
router.post("/disease-predict", userAuth, predictDisease);

export default router;
