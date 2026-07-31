import rateLimit from "express-rate-limit";

// General limiter — pure hi API par lagta hai, DoS/scraping se basic protection
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // per-IP requests allowed in the window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

// Strict limiter — login, register jaisi sensitive/brute-forceable routes ke liye
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // sirf 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // successful login count nahi hoga
  message: { message: "Too many attempts. Please try again after 15 minutes." },
});

// OTP limiter — forgot-password / verify-otp ke liye, isse OTP brute-force nahi ho payega
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP attempts. Please try again after 10 minutes." },
});