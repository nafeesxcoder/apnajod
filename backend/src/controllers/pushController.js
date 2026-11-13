const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const pushService = require("../services/pushService");
const env = require("../config/env");

const getPublicKey = asyncHandler(async (req, res) => {
  res.json({ ok: true, publicKey: env.push.publicKey || null });
});

const subscribe = asyncHandler(async (req, res) => {
  try {
    await pushService.saveSubscription(req.user.id, req.body);
    res.json({ ok: true, saved: true, reason: "backend" });
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Could not save subscription",
    );
  }
});

const unsubscribe = asyncHandler(async (req, res) => {
  await pushService.removeSubscription(req.user.id, req.body?.endpoint);
  res.json({ ok: true, saved: true, reason: "backend" });
});

const saveDevice = asyncHandler(async (req, res) => {
  try {
    await pushService.saveDeviceToken(req.user.id, req.body?.token, req.body?.platform);
    res.json({ ok: true, saved: true, reason: "backend" });
  } catch (error) {
    throw new ApiError(error.status || 500, error.message || "Could not save the device");
  }
});

const removeDevice = asyncHandler(async (req, res) => {
  await pushService.removeDeviceToken(req.user.id, req.body?.token);
  res.json({ ok: true, saved: true, reason: "backend" });
});

module.exports = { getPublicKey, subscribe, unsubscribe, saveDevice, removeDevice };
