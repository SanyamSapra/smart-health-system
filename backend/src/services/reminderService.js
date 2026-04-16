import cron from "node-cron";
import Reminder from "../models/Reminder.js";
import HealthLog from "../models/HealthLog.js";
import transporter from "../config/nodemailer.js";

function getTimeString(date = new Date()) {
  return date.toTimeString().slice(0, 5);
}

function isSameDay(dateA, dateB) {
  if (!dateA || !dateB) return false;
  const a = new Date(dateA);
  const b = new Date(dateB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildReminderEmail(type, user) {
  const intro = `<h3>Hi ${user.name},</h3>`;
  const foot = `<br/><p>Stay on track with Smart Health.</p>`;

  if (type === "medication") {
    return {
      subject: "⏰ Medication Reminder",
      html: `${intro}<p>This is a friendly reminder to take your medication as prescribed.</p>${foot}`,
    };
  }

  if (type === "inactivity") {
    return {
      subject: "⚠️ Inactivity Alert",
      html: `${intro}<p>We haven’t seen a health log from you in the last two days. Please check in when you can.</p>${foot}`,
    };
  }

  return {
    subject: "⏰ Health Log Reminder",
    html: `${intro}<p>You haven't logged your health metrics today. Please add a health log to keep your records up to date.</p>${foot}`,
  };
}

// Send email
async function sendReminderEmail(user, type) {
  try {
    const { subject, html } = buildReminderEmail(type, user);
    await transporter.sendMail({
      from: `"Smart Health" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject,
      html,
    });
    console.log(`Reminder sent to ${user.email} (${type})`);
  } catch (err) {
    console.error("Reminder email failed:", err.message);
  }
}

async function shouldSendReminder(reminder, latestLog) {
  if (!reminder.isActive) return false;

  const now = new Date();
  const currentTime = getTimeString(now);
  if (reminder.time !== currentTime) return false;
  if (reminder.lastSentAt && isSameDay(reminder.lastSentAt, now)) return false;

  if (reminder.type === "health-log") {
    return !latestLog || !isSameDay(latestLog.loggedAt, now);
  }

  if (reminder.type === "inactivity") {
    if (!latestLog) return true;
    const ageHours =
      (now.getTime() - new Date(latestLog.loggedAt).getTime()) / (1000 * 60 * 60);
    return ageHours >= 48;
  }

  return true;
}

// MAIN CRON JOB (runs every day at 8 PM)
export function startReminderJob() {
  cron.schedule("* * * * *", async () => {
    try {
      const reminders = await Reminder.find({ isActive: true }).populate(
        "user",
        "name email isAccountVerified"
      );

      for (const reminder of reminders) {
        if (!reminder.user?.isAccountVerified) continue;

        const latestLog = await HealthLog.findOne({ user: reminder.user._id })
          .sort({ loggedAt: -1 })
          .select("loggedAt")
          .lean();

        if (!(await shouldSendReminder(reminder, latestLog))) continue;

        await sendReminderEmail(reminder.user, reminder.type);
        reminder.lastSentAt = new Date();
        await reminder.save();
      }
    } catch (error) {
      console.error("Reminder service error:", error.message);
    }
  });
}