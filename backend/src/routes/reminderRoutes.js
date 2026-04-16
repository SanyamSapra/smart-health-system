import express from "express";
import userAuth from "../middlewares/userAuth.js";
import {
  getReminders,
  upsertReminder,
  deleteReminder,
} from "../controllers/reminderController.js";

const router = express.Router();

router.get("/", userAuth, getReminders);
router.post("/", userAuth, upsertReminder);
router.delete("/:id", userAuth, deleteReminder);

export default router;
