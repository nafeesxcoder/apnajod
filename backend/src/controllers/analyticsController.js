const asyncHandler = require("../utils/asyncHandler");
const { query } = require("../config/db");

/**
 * Track user event (page view, action, etc)
 */
const trackEvent = asyncHandler(async (req, res) => {
  const { event, screen, metadata } = req.body;
  const userId = req.user?.id;

  if (!event) {
    return res.status(400).json({ error: "event is required" });
  }

  try {
    await query(
      `INSERT INTO analytics_events (user_id, event, screen, metadata, created_at)
       VALUES (?, ?, ?, ?, NOW(6))`,
      [userId, event, screen, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    console.error("Failed to track event:", err);
  }

  res.json({ ok: true });
});

/**
 * Get user engagement metrics (for dashboard)
 */
const getUserMetrics = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [metrics] = await query(
    `SELECT
       (SELECT COUNT(*) FROM analytics_events WHERE user_id = ? AND event = 'like') AS likes_sent,
       (SELECT COUNT(*) FROM match_decisions WHERE actor_id = ? AND decision = 'interested') AS profiles_liked,
       (SELECT COUNT(*) FROM match_decisions WHERE target_id = ? AND decision = 'interested') AS likes_received,
       (SELECT COUNT(*) FROM mutual_matches WHERE user_a_id = ? OR user_b_id = ?) AS matches,
       (SELECT COUNT(*) FROM chats WHERE user_a = ? OR user_b = ?) AS chats_count,
       (SELECT SUM(duration) FROM video_calls WHERE (caller_id = ? OR receiver_id = ?)) AS total_call_time
     FROM DUAL`,
    [userId, userId, userId, userId, userId, userId, userId, userId, userId]
  );

  res.json({ ok: true, metrics });
});

/**
 * Get app-wide metrics (for admin dashboard)
 */
const getAppMetrics = asyncHandler(async (req, res) => {
  const [stats] = await query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS total_users,
       (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL 7 DAY AND deleted_at IS NULL) AS new_users_7d,
       (SELECT COUNT(*) FROM profiles WHERE verified = 1) AS verified_profiles,
       (SELECT COUNT(*) FROM mutual_matches) AS total_matches,
       (SELECT COUNT(*) FROM analytics_events WHERE created_at > NOW() - INTERVAL 1 DAY) AS events_today,
       (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at > NOW() - INTERVAL 1 DAY) AS active_users_today
     FROM DUAL`
  );

  res.json({ ok: true, stats });
});

module.exports = {
  trackEvent,
  getUserMetrics,
  getAppMetrics,
};
