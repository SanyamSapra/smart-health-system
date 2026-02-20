import dotenv from "dotenv";
dotenv.config();  // Load env FIRST

import nodemailer from "nodemailer";
 
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify()
  .then(() => console.log("SMTP Server is ready"))
  .catch((err) => console.error("SMTP Error:", err));

export default transporter;
