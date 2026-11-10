const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const env = require("../config/env");
const safetyService = require("./safetyService");

/**
 * Suspension appeals.
 *
 * A suspended login proves the password, then gets a short-lived appeal
 * token instead of a session. That token can only send an appeal: it is
 * signed with a key derived from the access secret, so the normal auth
 * middleware will never accept it as a login.
 */
const APPEAL_SECRET = () => `${env.jwt.accessSecret}:suspension-appeal`;
const MAX_MESSAGE = 1000;

function signAppealToken(userId) {
  return jwt.sign({ sub: userId, purpose: "appeal" }, APPEAL_SECRET(), {
    expiresIn: "30m",
  });
}

function userIdFromAppealToken(token) {
  try {
    const payload = jwt.verify(String(token || ""), APPEAL_SECRET());
    return payload.purpose === "appeal" ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

async function submitAppeal(userId, rawMessage) {
  const message = String(rawMessage || "").trim().slice(0, MAX_MESSAGE);
  if (message.length < 10) {
    const err = new Error("Please tell us a little more (at least 10 characters).");
    err.status = 400;
    throw err;
  }
  const [user] = await query("SELECT status FROM users WHERE id = ? AND deleted_at IS NULL", [userId]);
  if (!user || user.status !== "suspended") {
    const err = new Error("This account is not suspended.");
    err.status = 400;
    throw err;
  }
  // One open appeal per account: a second send updates it instead of
  // filling the queue with copies.
  const [open] = await query(
    "SELECT id FROM account_appeals WHERE user_id = ? AND status = 'open' LIMIT 1",
    [userId],
  );
  if (open) {
    await query("UPDATE account_appeals SET message = ? WHERE id = ?", [message, open.id]);
    return { id: open.id, updated: true };
  }
  const id = crypto.randomUUID();
  await query("INSERT INTO account_appeals (id, user_id, message) VALUES (?, ?, ?)", [
    id,
    userId,
    message,
  ]);
  return { id, updated: false };
}

async function listOpenAppeals(limit = 50) {
  return query(
    `SELECT a.id, a.user_id, a.message, a.created_at, a.updated_at,
            u.username, u.phone, p.first_name, p.city,
            (SELECT COUNT(DISTINCT r.reporter_id) FROM reports r WHERE r.reported_id = u.id) AS report_count
       FROM account_appeals a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
      WHERE a.status = 'open' AND u.deleted_at IS NULL
      ORDER BY a.updated_at DESC
      LIMIT ${Math.min(Math.max(Number(limit) || 50, 1), 200)}`,
  );
}

async function resolveAppeal(appealId, action) {
  if (!["restore", "reject"].includes(action)) {
    const err = new Error("Unknown action");
    err.status = 400;
    throw err;
  }
  const [appeal] = await query(
    "SELECT id, user_id FROM account_appeals WHERE id = ? AND status = 'open'",
    [appealId],
  );
  if (!appeal) {
    const err = new Error("Appeal not found or already handled.");
    err.status = 404;
    throw err;
  }
  if (action === "restore") {
    await safetyService.setAccountStatus(appeal.user_id, "active");
  }
  await query(
    "UPDATE account_appeals SET status = ?, resolved_at = NOW(6) WHERE id = ?",
    [action === "restore" ? "restored" : "rejected", appeal.id],
  );
  return { ok: true };
}

module.exports = {
  signAppealToken,
  userIdFromAppealToken,
  submitAppeal,
  listOpenAppeals,
  resolveAppeal,
};
