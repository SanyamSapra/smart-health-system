import "./src/config/env.js"; 

import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { startReminderJob } from "./src/services/reminderService.js";

connectDB();
startReminderJob();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});