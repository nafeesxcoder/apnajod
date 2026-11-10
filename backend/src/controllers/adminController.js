const asyncHandler = require("../utils/asyncHandler");
const adminService = require("../services/adminService");
const { ApiError } = require("../middleware/errorHandler");

const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.json({ ok: true, stats });
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await adminService.listUsers(req.query.q || "");
  res.json({ ok: true, users });
});

const updateUserRole = asyncHandler(async (req, res) => {
  if (!req.body.role) throw new ApiError(400, "role is required");
  await adminService.setUserRole(req.params.id, req.body.role);
  res.json({ ok: true });
});

const banUser = asyncHandler(async (req, res) => {
  await adminService.setAccountStatus(req.params.id, "suspended");
  res.json({ ok: true });
});

const unbanUser = asyncHandler(async (req, res) => {
  await adminService.setAccountStatus(req.params.id, "active");
  res.json({ ok: true });
});

const getVerifications = asyncHandler(async (req, res) => {
  const queue = await adminService.listPendingVerifications();
  res.json({ ok: true, queue });
});

const approveVerification = asyncHandler(async (req, res) => {
  await adminService.setVerificationStatus(req.params.id, "approved");
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
  const user = await userService.findUserByPhone(phone);
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
  const user = await userService.findUserByPhone(phone);
  if (!user || user.role !== "admin") throw new ApiError(400, "Invalid request");
  await otpService.verifyOtp({ channel: "phone", identifier: user.phone, code, purpose: "password_reset" });
  await userService.setPassword(user.id, newPassword, { mustChange: false });
  await sessionService.revokeAllSessions(user.id);
  res.json({ ok: true, message: "Password reset successfully. You can now log in." });
});

module.exports = {
  getStats, getUsers, updateUserRole, banUser, unbanUser, getVerifications, approveVerification, rejectVerification, getReports, resolveReport, updateAdminPassword, forgotAdminPassword, resetAdminPassword
};
