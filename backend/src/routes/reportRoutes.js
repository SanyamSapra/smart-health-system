import express from "express";
import userAuth from "../middlewares/userAuth.js";
import {
  uploadReport,
  getReports,
  getReport,
  viewReportFile,
  deleteReport,
  analyzeReport,
} from "../controllers/reportController.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

router.post("/upload", userAuth, upload.single("file"), uploadReport);
router.get("/", userAuth, getReports);
router.get("/:id/file", userAuth, viewReportFile);
router.get("/:id", userAuth, getReport);
router.delete("/:id", userAuth, deleteReport);
router.post("/:id/analyze", userAuth, analyzeReport);

export default router;
