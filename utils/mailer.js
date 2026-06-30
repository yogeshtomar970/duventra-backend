// utils/mailer.js
import nodemailer from "nodemailer";

// Gmail SMTP transporter
// .env mein chahiye: GMAIL_USER, GMAIL_APP_PASSWORD
//
// GMAIL_APP_PASSWORD ek normal Gmail password NAHI hota — Google Account →
// Security → 2-Step Verification ON karke → App Passwords se generate karna
// padta hai (myaccount.google.com/apppasswords)
//
// NOTE: Render (aur kai cloud hosts) pe `service: "gmail"` shortcut (jo
// internally port 465/SSL try karta hai) IPv6 route na milne ki wajah se
// "ENETUNREACH" / connection timeout deta hai. Explicit host + port 587
// (STARTTLS) zyada reliable hai cloud environments mein.
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // port 587 ke liye false — STARTTLS khud upgrade karta hai
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 15000, // 15 sec — cloud host ka network thoda slow ho sakta hai
});

export const sendOtpEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"Duventra" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 420px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #b5651d; margin-bottom: 4px;">Password Reset</h2>
        <p style="color: #444; font-size: 14px;">
          Aapka password reset OTP yeh hai:
        </p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #222; text-align: center; margin: 20px 0; padding: 14px; background: #f7f3ee; border-radius: 8px;">
          ${otp}
        </div>
        <p style="color: #888; font-size: 12px;">
          Yeh OTP 10 minute mein expire ho jaayega. Agar aapne yeh request nahi ki, toh is email ko ignore karein.
        </p>
      </div>
    `,
  });
};
