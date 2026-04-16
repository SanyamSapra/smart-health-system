import Reminder from "../models/Reminder.js";
import User from "../models/User.js";

const DEFAULT_REMINDER_TIME = {
  "health-log": "20:00",
  inactivity: "10:00",
  medication: "08:00",
};

export const getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({ user: req.userId }).lean();
    return res.json({ success: true, data: reminders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const upsertReminder = async (req, res) => {
  try {
    const { type, isActive, time } = req.body;

    if (!type || !["health-log", "inactivity", "medication"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Reminder type must be health-log, inactivity, or medication.",
      });
    }

    const reminderTime = time || DEFAULT_REMINDER_TIME[type];
    const isActiveValue = isActive !== undefined ? isActive : true;

    let reminder = await Reminder.findOne({ user: req.userId, type });

    if (reminder) {
      reminder.isActive = isActiveValue;
      reminder.time = reminderTime;
      await reminder.save();
    } else {
      reminder = await Reminder.create({
        user: req.userId,
        type,
        time: reminderTime,
        isActive: isActiveValue,
      });
    }

    return res.json({ success: true, data: reminder });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }

    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      user: req.userId,
      _id: req.params.id,
    });

    if (!reminder) {
      return res.status(404).json({ success: false, message: "Reminder not found" });
    }

    return res.json({ success: true, message: "Reminder deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createDefaultReminderForUser = async (userId) => {
  try {
    const userExists = await User.exists({ _id: userId });
    if (!userExists) return;

    await Reminder.updateOne(
      { user: userId, type: "health-log" },
      {
        $setOnInsert: {
          user: userId,
          time: DEFAULT_REMINDER_TIME["health-log"],
          isActive: true,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Failed to create default reminder", error.message);
  }
};
