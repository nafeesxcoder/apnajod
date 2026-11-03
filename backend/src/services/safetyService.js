const crypto = require('crypto');
const { query } = require('../config/db');

async function submitReport(reporterId, reportedId, reason, details, reportId) {
  await query(
    `INSERT IGNORE INTO reports (id, reporter_id, reported_id, reason, details) VALUES (?, ?, ?, ?, ?)`,
    [reportId, reporterId, reportedId, reason, details || null],
  );
  return { ok: true };
}

async function blockUser(blockerId, blockedId) {
  await query(
    `INSERT IGNORE INTO blocks (id, blocker_id, blocked_id) VALUES (?, ?, ?)`,
    [crypto.randomUUID(), blockerId, blockedId],
  );
  return { ok: true };
}

async function unblockUser(blockerId, blockedId) {
  await query('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [blockerId, blockedId]);
  return { ok: true };
}

async function isBlocked(userId, targetId) {
  const rows = await query(
    'SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [userId, targetId, targetId, userId],
  );
  return rows.length > 0;
}

async function unmatchUser(userId, targetId) {
  const [userA, userB] = [userId, targetId].sort();
  await query('DELETE FROM mutual_matches WHERE user_a_id = ? AND user_b_id = ?', [userA, userB]);
  await query(
    'DELETE FROM match_decisions WHERE (actor_id = ? AND target_id = ?) OR (actor_id = ? AND target_id = ?)',
    [userId, targetId, targetId, userId],
  );
  return { ok: true };
}

module.exports = { submitReport, blockUser, unblockUser, isBlocked, unmatchUser };