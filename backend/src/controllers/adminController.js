const asyncHandler = require("../utils/asyncHandler");
const adminService = require("../services/adminService");
const growthService = require("../services/growthService");
const profileRewardService = require("../services/profileRewardService");
const { ApiError } = require("../middleware/errorHandler");

const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.json({ ok: true, stats });
});

const getGrowth = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const growth = await growthService.getGrowth({ days: req.query.days });
  res.json({ ok: true, growth });
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await adminService.listUsers(req.query.q || "", 200, String(req.query.filter || "all"));
  res.json({ ok: true, users });
});

const updateUserRole = asyncHandler(async (req, res) => {
  if (!req.body.role) throw new ApiError(400, "role is required");
  await adminService.setUserRole(req.params.id, req.body.role);
  res.json({ ok: true });
});

const banUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new ApiError(400, "You cannot suspend your own account.");
  const userService = require("../services/userService");
  const target = await userService.findUserById(req.params.id);
  if (!target) throw new ApiError(404, "User not found");
  if (target.role === "admin") throw new ApiError(400, "Remove admin access before suspending this account.");
  await adminService.setAccountStatus(req.params.id, "suspended");
  res.json({ ok: true });
});

const unbanUser = asyncHandler(async (req, res) => {
  await adminService.setAccountStatus(req.params.id, "active");
  res.json({ ok: true });
});

const dailyQuestionService = require("../services/dailyQuestionService");

const getQuestions = asyncHandler(async (req, res) => {
  const questions = await dailyQuestionService.listAll();
  res.json({ ok: true, questions });
});

const createQuestion = asyncHandler(async (req, res) => {
  await dailyQuestionService.create(req.body?.question, req.body?.options);
  res.json({ ok: true });
});

const setQuestionActive = asyncHandler(async (req, res) => {
  await dailyQuestionService.setActive(req.params.id, req.body?.active === true);
  res.json({ ok: true });
});

const getVerifications = asyncHandler(async (req, res) => {
  const queue = await adminService.listPendingVerifications();
  res.json({ ok: true, queue });
});

const approveVerification = asyncHandler(async (req, res) => {
  await adminService.setVerificationStatus(req.params.id, "approved");
  // An approved selfie is often the last step to 100% - the member is told
  // by push, since they are not the one in the app right now.
  await profileRewardService.rewardIfComplete(req.params.id);
  res.json({ ok: true });
});

const rejectVerification = asyncHandler(async (req, res) => {
  await adminService.setVerificationStatus(req.params.id, "rejected");
  res.json({ ok: true });
});

const getReports = asyncHandler(async (req, res) => {
  const reports = await adminService.listOpenReports();
  res.json({ ok: true, reports });
});

const resolveReport = asyncHandler(async (req, res) => {
  const action = ["dismiss", "dismissed"].includes(req.body.action) ? "dismissed" : "actioned";
  await adminService.resolveReportsAbout(req.params.id, action);
  res.json({ ok: true });
});

// A reported post: remove it (and tell its owner), or keep it.
const removePost = asyncHandler(async (req, res) => {
  const postService = require("../services/postService");
  try {
    await postService.removePostByAdmin(req.params.id);
  } catch (error) {
    throw new ApiError(error.status || 500, error.message);
  }
  res.json({ ok: true });
});

const keepPost = asyncHandler(async (req, res) => {
  const postService = require("../services/postService");
  res.json(await postService.keepPostByAdmin(req.params.id));
});

const getAppeals = asyncHandler(async (req, res) => {
  const appealService = require("../services/appealService");
  const appeals = await appealService.listOpenAppeals();
  res.json({ ok: true, appeals });
});

const resolveAppeal = asyncHandler(async (req, res) => {
  const appealService = require("../services/appealService");
  try {
    await appealService.resolveAppeal(req.params.id, req.body?.action);
  } catch (error) {
    throw new ApiError(error.status || 500, error.message);
  }
  res.json({ ok: true });
});

// Festival themes on the whole app.
const festivalError = (error) => new ApiError(error.status || 500, error.message);

const getFestivals = asyncHandler(async (req, res) => {
  const festivalService = require("../services/festivalService");
  res.json({ ok: true, ...(await festivalService.listForAdmin()) });
});

const scheduleFestival = asyncHandler(async (req, res) => {
  const festivalService = require("../services/festivalService");
  try {
    res.json({ ok: true, ...(await festivalService.schedule(req.user.id, req.body || {})) });
  } catch (error) {
    throw festivalError(error);
  }
});

const stopFestival = asyncHandler(async (req, res) => {
  const festivalService = require("../services/festivalService");
  res.json({ ok: true, ...(await festivalService.stop()) });
});

const cancelFestival = asyncHandler(async (req, res) => {
  const festivalService = require("../services/festivalService");
  try {
    res.json({ ok: true, ...(await festivalService.cancel(req.params.id)) });
  } catch (error) {
    throw festivalError(error);
  }
});

// UPI payments waiting to be checked against the bank app.
const getPayments = asyncHandler(async (req, res) => {
  const upiService = require("../services/upiService");
  res.json({ ok: true, ...(await upiService.listForAdmin()) });
});

const approvePayment = asyncHandler(async (req, res) => {
  const upiService = require("../services/upiService");
  try {
    res.json({ ok: true, ...(await upiService.approve(req.params.id)) });
  } catch (error) {
    throw new ApiError(error.status || 500, error.message);
  }
});

const rejectPayment = asyncHandler(async (req, res) => {
  const upiService = require("../services/upiService");
  try {
    res.json({ ok: true, ...(await upiService.reject(req.params.id, req.body?.reason)) });
  } catch (error) {
    throw new ApiError(error.status || 500, error.message);
  }
});

const updateAdminPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(400, "Current and new password are required");
  if (newPassword.length < 6) throw new ApiError(400, "New password must be at least 6 characters");
  const userService = require("../services/userService");
  const user = await userService.findUserById(req.user.id);
  if (!user || !(await userService.verifyPassword(user, currentPassword))) throw new ApiError(401, "Current password is incorrect");
  await userService.setPassword(user.id, newPassword);
  res.json({ ok: true, message: "Password updated successfully" });
});

const forgotAdminPassword = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw new ApiError(400, "Registered phone number is required");
  const userService = require("../services/userService");
  const otpService = require("../services/otpService");
  const { normalizeIndianPhone } = require("../utils/otp");
  const user = await userService.findUserByPhone(normalizeIndianPhone(phone) || phone);
  if (!user || user.role !== "admin") return res.json({ ok: true, message: "If this is a registered admin phone, an OTP has been sent." });
  await otpService.requestOtp({ channel: "phone", identifier: user.phone, purpose: "password_reset" });
  res.json({ ok: true, message: "If this is a registered admin phone, an OTP has been sent." });
});

const resetAdminPassword = asyncHandler(async (req, res) => {
  const { phone, code, newPassword } = req.body;
  if (!phone || !code || !newPassword) throw new ApiError(400, "Phone, code, and new password are required");
  if (newPassword.length < 6) throw new ApiError(400, "New password must be at least 6 characters");
  const userService = require("../services/userService");
  const otpService = require("../services/otpService");
  const sessionService = require("../services/sessionService");
  const { normalizeIndianPhone } = require("../utils/otp");
  const user = await userService.findUserByPhone(normalizeIndianPhone(phone) || phone);
  if (!user || user.role !== "admin") throw new ApiError(400, "Invalid request");
  await otpService.verifyOtp({ channel: "phone", identifier: user.phone, code, purpose: "password_reset" });
  await userService.setPassword(user.id, newPassword, { mustChange: false });
  await sessionService.revokeAllSessions(user.id);
  res.json({ ok: true, message: "Password reset successfully. You can now log in." });
});

module.exports = {
  getQuestions,
  createQuestion,
  setQuestionActive,
  getStats, getGrowth, getUsers, updateUserRole, banUser, unbanUser, getVerifications, approveVerification, rejectVerification, getReports, resolveReport, removePost, keepPost, getAppeals, resolveAppeal, getPayments, approvePayment, rejectPayment, getFestivals, scheduleFestival, stopFestival, cancelFestival, updateAdminPassword, forgotAdminPassword, resetAdminPassword
};
