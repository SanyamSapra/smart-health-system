import express from "express";
import { addHealthLog } from "../controllers/healthController.js";
import userAuth from "../middlewares/userAuth.js";
import { getLatestHealthSummary } from "../controllers/healthController.js";

const router = express.Router();

router.post("/add-log", userAuth, addHealthLog);
router.get("/latest", userAuth, getLatestHealthSummary);

export default router;