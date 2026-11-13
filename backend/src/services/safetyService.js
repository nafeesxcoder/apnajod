const crypto = require('crypto');
const { query } = require('../config/db');
const sessionService = require('./sessionService');
const { forgetAccountStatus } = require('../middleware/auth');

async function submitReport(reporterId, reportedId, reason, details, reportId, postId = null) {
  // One open report per person per reporter - per account, or per post when
  // it is about a post. Reporting the same thing again updates that report,
  // so five taps from one member still count as one complaint in the admin
  // queue rather than looking like five people.
  const post = typeof postId === "string" && /^[0-9a-f-]{36}$/i.test(postId) ? postId : null;
  const [existing] = await query(
    `SELECT id FROM reports
      WHERE reporter_id = ? AND reported_id = ? AND review_status = 'open'
        AND ${post ? "post_id = ?" : "post_id IS NULL"}
      LIMIT 1`,
    post ? [reporterId, reportedId, post] : [reporterId, reportedId],
  );
  if (existing) {
    await query(`UPDATE reports SET reason = ?, details = ? WHERE id = ?`, [
      reason,
      details || null,
      existing.id,
    ]);
    return { ok: true, updated: true };
  }
  await query(
    `INSERT IGNORE INTO reports (id, reporter_id, reported_id, reason, details, post_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [reportId, reporterId, reportedId, reason, details || null, post],
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

/**
 * The moderation queue, grouped by the person reported rather than by
 * report, because three complaints about one account is the thing that
 * matters and a flat list buries it.
 */
async function listOpenReports(limit = 50) {
  const accounts = await query(
    `SELECT reported.id          AS reported_id,
            reported.username    AS reported_username,
            profile.first_name   AS reported_name,
            profile.city         AS reported_city,
            reported.status      AS account_status,
            COUNT(DISTINCT r.reporter_id) AS report_count,
            GROUP_CONCAT(DISTINCT r.reason ORDER BY r.created_at SEPARATOR ' | ') AS reasons,
            MIN(r.created_at)    AS first_reported_at,
            MAX(r.created_at)    AS last_reported_at
       FROM reports r
       JOIN users reported ON reported.id = r.reported_id
       LEFT JOIN profiles profile ON profile.user_id = reported.id
      WHERE r.review_status = 'open'
        AND reported.deleted_at IS NULL
      GROUP BY reported.id, reported.username, profile.first_name,
               profile.city, reported.status
      ORDER BY report_count DESC, last_reported_at DESC
      LIMIT ${Number(limit)}`,
  );
  if (!accounts.length) return accounts;
  // The posts each account was reported for, with the photo, so a moderator
  // can see what was reported and remove just that post.
  const ids = accounts.map((row) => row.reported_id);
  const posts = await query(
    `SELECT r.reported_id, r.post_id, p.media_url, p.caption, p.created_at,
            COUNT(DISTINCT r.reporter_id) AS report_count,
            GROUP_CONCAT(DISTINCT r.reason ORDER BY r.reason SEPARATOR ' | ') AS reasons
       FROM reports r
       JOIN posts p ON p.id = r.post_id
      WHERE r.review_status = 'open'
        AND r.post_id IS NOT NULL
        AND r.reported_id IN (${ids.map(() => "?").join(", ")})
      GROUP BY r.reported_id, r.post_id, p.media_url, p.caption, p.created_at
      ORDER BY report_count DESC, p.created_at DESC`,
    ids,
  );
  return accounts.map((account) => ({
    ...account,
    reported_posts: posts
      .filter((post) => post.reported_id === account.reported_id)
      .map(({ reported_id: _owner, ...post }) => ({ ...post, report_count: Number(post.report_count) || 0 })),
  }));
}

/** What each complaint actually said, for one account. */
async function listReportsAbout(reportedId) {
  return query(
    `SELECT r.id, r.reason, r.details, r.created_at, r.review_status,
            reporter.username AS reporter_username
       FROM reports r
       JOIN users reporter ON reporter.id = r.reporter_id
      WHERE r.reported_id = ?
      ORDER BY r.created_at DESC`,
    [reportedId],
  );
}

/** Close every open report about someone, once a decision has been made. */
async function resolveReportsAbout(reportedId, reviewStatus) {
  if (!["actioned", "dismissed"].includes(reviewStatus)) {
    throw new Error(`Unknown review status: ${reviewStatus}`);
  }
  const result = await query(
    `UPDATE reports
        SET review_status = ?, reviewed_at = NOW(6)
      WHERE reported_id = ? AND review_status = 'open'`,
    [reviewStatus, reportedId],
  );
  return { closed: result.affectedRows ?? 0 };
}

/**
 * Suspend or restore an account.
 *
 * Suspending also drops their refresh tokens: without that they would keep
 * working until the refresh happened to fail, and a harassment case is not
 * something to leave running.
 */
async function setAccountStatus(userId, status) {
  if (!["active", "suspended"].includes(status)) {
    throw new Error(`Unknown account status: ${status}`);
  }
  await query("UPDATE users SET status = ? WHERE id = ?", [status, userId]);
  forgetAccountStatus(userId);
  if (status === "suspended") {
    await sessionService.revokeAllSessions(userId);
  }
  return { userId, status };
}

module.exports = {
  submitReport,
  blockUser,
  unblockUser,
  isBlocked,
  unmatchUser,
  listOpenReports,
  listReportsAbout,
  resolveReportsAbout,
  setAccountStatus,
};