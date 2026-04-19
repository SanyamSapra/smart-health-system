import transporter from "../config/nodemailer.js";

const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function checkAndSendDailyReminder(user) {
  if (!user?.email) {
    return false;
  }

  const lastSentAt = user.lastReminderSentAt
    ? new Date(user.lastReminderSentAt).getTime()
    : 0;

  if (lastSentAt && Date.now() - lastSentAt < REMINDER_INTERVAL_MS) {
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"Smart Health System" <${process.env.SENDER_EMAIL}>`,
      to: user.email,
      subject: "Daily Health Reminder",
      text:
        "Don't forget to log your health data today. Tracking daily helps you stay on top of your health.",
      html:
        "<p>Don't forget to log your health data today. Tracking daily helps you stay on top of your health.</p>",
    });

    user.lastReminderSentAt = new Date();
    await user.save();
    return true;
  } catch (error) {
    console.error("Daily reminder email error:", error.message);
    return false;
  }
}
