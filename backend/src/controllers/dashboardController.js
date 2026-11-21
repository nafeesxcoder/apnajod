const asyncHandler = require("../utils/asyncHandler");
const { query } = require("../config/db");

/**
 * Dashboard overview stats
 */
const getOverview = asyncHandler(async (req, res) => {
  const [overview] = await query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS total_users,
       (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL 1 DAY AND deleted_at IS NULL) AS new_users_today,
       (SELECT COUNT(*) FROM profiles WHERE verified = 1) AS verified_users,
       (SELECT COUNT(*) FROM mutual_matches) AS total_matches,
       (SELECT COUNT(*) FROM chats) AS total_chats,
       (SELECT COUNT(*) FROM safety_reports WHERE status = 'pending') AS pending_reports,
       (SELECT COUNT(*) FROM profile_verifications WHERE status = 'pending') AS pending_verifications
     FROM DUAL`
  );

  res.json({ ok: true, overview });
});

/**
 * Pending verifications (profile photos, selfies)
 */
const getPendingVerifications = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT
       pv.id, pv.user_id, pv.type, pv.photo_url, pv.status, pv.created_at,
       p.first_name, p.age, p.city
     FROM profile_verifications pv
     LEFT JOIN profiles p ON p.user_id = pv.user_id
     WHERE pv.status = 'pending'
     ORDER BY pv.created_at ASC
     LIMIT 50`
  );

  res.json({ ok: true, verifications: rows });
});

/**
 * Approve/Reject verification
 */
const setVerificationStatus = asyncHandler(async (req, res) => {
  const { verificationId, status, notes } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  await query(
    `UPDATE profile_verifications SET status = ?, reviewed_by = ?, reviewed_at = NOW(6), notes = ?
     WHERE id = ?`,
    [status, req.user.id, notes, verificationId]
  );

  res.json({ ok: true });
});

/**
 * Pending safety reports
 */
const getPendingReports = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT
       sr.id, sr.reporter_id, sr.reported_id, sr.reason, sr.description, sr.status, sr.created_at,
       r.first_name AS reporter_name, t.first_name AS reported_name
     FROM safety_reports sr
     LEFT JOIN profiles r ON r.user_id = sr.reporter_id
     LEFT JOIN profiles t ON t.user_id = sr.reported_id
     WHERE sr.status = 'pending'
     ORDER BY sr.created_at ASC
     LIMIT 50`
  );

  res.json({ ok: true, reports: rows });
});

/**
 * Process safety report
 */
const setReportStatus = asyncHandler(async (req, res) => {
  const { reportId, status, action } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  await query(
    `UPDATE safety_reports SET status = ?, action = ?, reviewed_by = ?, reviewed_at = NOW(6)
     WHERE id = ?`,
    [status, action, req.user.id, reportId]
  );

  // If action is block/suspend, update user status
  if (action === "block") {
    const [report] = await query("SELECT reported_id FROM safety_reports WHERE id = ?", [reportId]);
    if (report) {
      await query("UPDATE users SET status = 'suspended' WHERE id = ?", [report.reported_id]);
    }
  }

  res.json({ ok: true });
});

/**
 * Chats to moderate
 */
const getFlaggedChats = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT
       c.id, c.user_a, c.user_b, c.last_message, c.last_message_at,
       ua.first_name AS user_a_name, ub.first_name AS user_b_name
     FROM chats c
     LEFT JOIN profiles ua ON ua.user_id = c.user_a
     LEFT JOIN profiles ub ON ub.user_id = c.user_b
     WHERE c.flagged = 1
     ORDER BY c.last_message_at DESC
     LIMIT 20`
  );

  res.json({ ok: true, chats: rows });
});

/**
 * Get system health
 */
const getHealth = asyncHandler(async (req, res) => {
  const [db] = await query("SELECT 1");
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();

  res.json({
    ok: true,
    health: {
      database: !!db,
      uptime: Math.floor(uptime),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
      timestamp: new Date(),
    },
  });
});

module.exports = {
  getOverview,
  getPendingVerifications,
  setVerificationStatus,
  getPendingReports,
  setReportStatus,
  getFlaggedChats,
  getHealth,
};
