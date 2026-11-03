const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const env = require("../config/env");
const router = express.Router();
// Every limiter is per-IP. The automated tests drive hundreds of requests
// from 127.0.0.1, so they are skipped there; the per-account lockout in
// userService still applies and is what the tests actually assert on.
const limiter = (max, message) =>
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.nodeEnv === "test",
    message: { error: message },
  });

const otpRequestLimiter = limiter(30, "Too many requests. Please try again later.");
const otpVerifyLimiter = limiter(50, "Too many requests. Please try again later.");
// Password sign-in attempts are throttled per IP on top of the per-account
// lockout in userService, so a spray across many usernames is also slowed.
const loginLimiter = limiter(40, "Too many sign-in attempts. Please try again later.");

// Sign up: mobile + username + password, confirmed by one SMS code
router.get("/username/available", authController.checkUsername);
router.post("/register", otpRequestLimiter, authController.registerStart);
router.post("/register/verify", otpVerifyLimiter, authController.registerVerify);

// Sign in with username (or mobile) + password
router.post("/login", loginLimiter, authController.login);

// Forgot password: OTP to the registered mobile, then set a new password
router.post("/password/forgot", otpRequestLimiter, authController.forgotPassword);
router.post("/password/reset", otpVerifyLimiter, authController.resetPassword);
router.post("/password/change", requireAuth, authController.changePassword);

// OTP: phone or email login (kept for members who have no password yet)
router.post("/otp/request", otpRequestLimiter, authController.requestOtp);
router.post("/otp/verify", otpVerifyLimiter, authController.verifyOtp);
// Session
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.me);
router.delete("/account", requireAuth, authController.deleteAccount);
router.post("/deactivate", requireAuth, authController.deactivateAccount);
// Google
router.get("/google", authController.googleStart);
router.get("/google/callback", authController.googleCallback);
// Apple
router.get("/apple", authController.appleStart);
router.post("/apple/callback", authController.appleCallback);
// LinkedIn
router.get("/linkedin", authController.linkedinStart);
router.get("/linkedin/callback", authController.linkedinCallback);
module.exports = router;
