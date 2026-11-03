const crypto = require("crypto");
const twilio = require("twilio");
const { query } = require("../config/db");
const env = require("../config/env");
const chatService = require("./chatService");
const pushService = require("./pushService");

function parseJsonColumn(value, fallback) {
  if (value === null || value === undefined) return fallback;
  return typeof value === "string" ? JSON.parse(value) : value;
}

async function getIceServers() {
  if (!env.twilio.accountSid || !env.twilio.authToken) {
    return {
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    };
  }
  try {
    const client = twilio(env.twilio.accountSid, env.twilio.authToken);
    const token = await client.tokens.create();
    return { iceServers: token.iceServers };
  } catch {
    return {
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    };
  }
}

async function getCallOr404(callId, userId) {
  const rows = await query("SELECT * FROM calls WHERE id = ?", [callId]);
  if (!rows.length) {
    const err = new Error("Call not found");
    err.status = 404;
    throw err;
  }
  const call = rows[0];
  if (call.caller_id !== userId && call.callee_id !== userId) {
    const err = new Error("You do not have access to this call.");
    err.status = 403;
    throw err;
  }
  return call;
}

async function startCall(conversationId, callerId, mode) {
  const participants = await chatService.assertParticipant(
    conversationId,
    callerId,
  );
  const calleeId = participants.find((id) => id !== callerId);
  if (!calleeId) {
    const err = new Error("Could not determine the other participant.");
    err.status = 400;
    throw err;
  }
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO calls (id, conversation_id, caller_id, callee_id, mode, status)
     VALUES (?, ?, ?, ?, ?, 'ringing')`,
    [
      id,
      conversationId,
      callerId,
      calleeId,
      mode === "video" ? "video" : "audio",
    ],
  );
  const [profile] = await query(
    "SELECT first_name FROM profiles WHERE user_id = ?",
    [callerId],
  );
  const callerName = profile?.first_name || "Someone";
  pushService
    .notifyUser(calleeId, {
      title: callerName,
      body: mode === "video" ? "Incoming video call" : "Incoming audio call",
      type: "incoming_call",
      callId: id,
      mode,
    })
    .catch(() => undefined);
  return {
    id,
    conversationId,
    calleeId,
    mode: mode === "video" ? "video" : "audio",
    status: "ringing",
  };
}

async function respondToCall(callId, userId, accept) {
  const call = await getCallOr404(callId, userId);
  if (call.callee_id !== userId) {
    const err = new Error("Only the recipient can respond to this call.");
    err.status = 403;
    throw err;
  }
  if (call.status !== "ringing") return { id: callId, status: call.status };
  const status = accept ? "accepted" : "declined";
  await query("UPDATE calls SET status = ? WHERE id = ?", [status, callId]);
  return { id: callId, status };
}

async function endCall(callId, userId, reason) {
  const call = await getCallOr404(callId, userId);
  if (call.status === "ended") return { id: callId, status: "ended" };
  await query(
    "UPDATE calls SET status = 'ended', ended_at = NOW(6), ended_reason = ? WHERE id = ?",
    [reason || "hangup", callId],
  );
  return { id: callId, status: "ended" };
}

async function getCallStatus(callId, userId) {
  const call = await getCallOr404(callId, userId);
  return { id: call.id, status: call.status, mode: call.mode };
}

async function sendSignal(callId, userId, type, payload) {
  await getCallOr404(callId, userId);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO call_signals (id, call_id, sender_id, type, payload, created_at_ms)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, callId, userId, type, JSON.stringify(payload ?? {}), Date.now()],
  );
  return { ok: true };
}

async function pollSignals(callId, userId, sinceMs) {
  await getCallOr404(callId, userId);
  const rows = await query(
    `SELECT * FROM call_signals WHERE call_id = ? AND sender_id != ? AND created_at_ms > ?
     ORDER BY created_at_ms ASC`,
    [callId, userId, Number(sinceMs) || 0],
  );
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    payload: parseJsonColumn(row.payload, {}),
    createdAtMs: Number(row.created_at_ms),
  }));
}

async function getIncomingCalls(userId) {
  const rows = await query(
    `SELECT * FROM calls WHERE callee_id = ? AND status = 'ringing'
     AND started_at > DATE_SUB(NOW(6), INTERVAL 45 SECOND)
     ORDER BY started_at DESC LIMIT 1`,
    [userId],
  );
  if (!rows.length) return null;
  const call = rows[0];
  const [profile] = await query(
    "SELECT first_name FROM profiles WHERE user_id = ?",
    [call.caller_id],
  );
  return {
    id: call.id,
    conversationId: call.conversation_id,
    callerId: call.caller_id,
    callerName: profile?.first_name || "Someone",
    mode: call.mode,
  };
}

module.exports = {
  getIceServers,
  startCall,
  respondToCall,
  endCall,
  getCallStatus,
  sendSignal,
  pollSignals,
  getIncomingCalls,
};
