const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const callService = require("../services/callService");

const getIceServers = asyncHandler(async (req, res) => {
  const data = await callService.getIceServers();
  res.json({ ok: true, ...data });
});

const startCall = asyncHandler(async (req, res) => {
  const { conversationId, mode } = req.body;
  if (!conversationId) throw new ApiError(400, "conversationId is required");
  try {
    const call = await callService.startCall(conversationId, req.user.id, mode);
    res.json({ ok: true, ...call });
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Could not start call",
    );
  }
});

const respondToCall = asyncHandler(async (req, res) => {
  const { accept } = req.body;
  if (typeof accept !== "boolean")
    throw new ApiError(400, "accept (boolean) is required");
  try {
    const result = await callService.respondToCall(
      req.params.callId,
      req.user.id,
      accept,
    );
    res.json({ ok: true, ...result });
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Could not respond to call",
    );
  }
});

const endCall = asyncHandler(async (req, res) => {
  try {
    const result = await callService.endCall(
      req.params.callId,
      req.user.id,
      req.body?.reason,
    );
    res.json({ ok: true, ...result });
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Could not end call",
    );
  }
});

const getCallStatus = asyncHandler(async (req, res) => {
  try {
    const result = await callService.getCallStatus(
      req.params.callId,
      req.user.id,
    );
    res.json({ ok: true, ...result });
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Could not read call status",
    );
  }
});

const sendSignal = asyncHandler(async (req, res) => {
  const { type, payload } = req.body;
  if (!type) throw new ApiError(400, "type is required");
  try {
    await callService.sendSignal(req.params.callId, req.user.id, type, payload);
    res.json({ ok: true, saved: true, reason: "backend" });
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Could not send signal",
    );
  }
});

const pollSignals = asyncHandler(async (req, res) => {
  try {
    const signals = await callService.pollSignals(
      req.params.callId,
      req.user.id,
      req.query.sinceMs,
    );
    res.json({ ok: true, signals });
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Could not read signals",
    );
  }
});

const getIncoming = asyncHandler(async (req, res) => {
  const call = await callService.getIncomingCalls(req.user.id);
  res.json({ ok: true, call });
});

module.exports = {
  getIceServers,
  startCall,
  respondToCall,
  endCall,
  getCallStatus,
  sendSignal,
  pollSignals,
  getIncoming,
};
