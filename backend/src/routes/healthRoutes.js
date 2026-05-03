import express from "express";
import {
  addHealthLog,
  getHealthHistory,
  getLatestHealthSummary,
  updateHealthLog,
  deleteHealthLog,
  markRecovered,
} from "../controllers/healthController.js";
import userAuth from "../middlewares/userAuth.js";

const router = express.Router();

router.post("/add-log", userAuth, addHealthLog);
router.get("/latest", userAuth, getLatestHealthSummary);
router.get("/history", userAuth, getHealthHistory);   
router.post("/mark-recovered", userAuth, markRecovered);
router.put("/update/:id", userAuth, updateHealthLog);
router.delete("/delete/:id", userAuth, deleteHealthLog); 

export default router;
