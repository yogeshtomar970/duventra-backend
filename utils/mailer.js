// utils/mailer.js
//
// Resend (HTTPS-based email API) — SMTP ki jagah yeh use kar rahe hain kyunki
// Render ka network outbound SMTP ports (587/465) ke liye IPv6-only route deta
// hai jiska route hi available nahi hota → "ENETUNREACH" error aata tha.
// Resend normal HTTPS request bhejta hai, isliye yeh problem nahi aati.
//
// .env mein chahiye: RESEND_API_KEY
// (resend.com → API Keys → Create API Key se milegi)

const RESEND_API_URL = "https://api.resend.com/emails";

export const sendOtpEmail = async (toEmail, otp) => {
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Apna domain verify karne tak sirf yeh default address use kar sakte ho
      from: "Duventra <onboarding@resend.dev>",
      to: [toEmail],
      subject: "Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 420px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #b5651d; margin-bottom: 4px;">Password Reset</h2>
          <p style="color: #444; font-size: 14px;">
            Your password reset OTP is:
          </p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #222; text-align: center; margin: 20px 0; padding: 14px; background: #f7f3ee; border-radius: 8px;">
            ${otp}
          </div>
          <p style="color: #888; font-size: 12px;">
            This OTP will expire in 10 minutes. If you did not make this request, please ignore the email.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Resend API error:", res.status, errBody);
    throw new Error("Failed to send OTP email");
  }

  return res.json();
};