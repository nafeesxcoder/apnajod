const { query } = require("../config/db");

/**
 * "Download my data" in Safety Center: everything Apnajoda keeps about you,
 * as one JSON file. Only your own messages are included (what others wrote
 * is theirs); stories are not, they are deleted after 24 hours.
 */
async function exportFor(userId) {
  const parse = (value) => {
    if (value == null || typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };
  const [account] = await query(
    `SELECT id, username, full_name, phone, email, is_private, created_at, last_active_at
       FROM users WHERE id = ?`,
    [userId],
  ).catch(() => query("SELECT id, username, full_name, phone, is_private, created_at, last_active_at FROM users WHERE id = ?", [userId]));
  const [profile] = await query("SELECT * FROM profiles WHERE user_id = ?", [userId]);
  const [intent] = await query("SELECT intent, timeline, children, family, relocation FROM profile_intent WHERE user_id = ?", [userId]);
  const [preferences] = await query("SELECT * FROM matching_preferences WHERE user_id = ?", [userId]);
  const photos = await query("SELECT photo_url, position FROM profile_photos WHERE user_id = ? ORDER BY position", [userId]);
  const posts = await query("SELECT id, media_url, caption, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC", [userId]);
  const matches = await query(
    `SELECT u.username, mm.created_at AS matched_at
       FROM mutual_matches mm
       JOIN users u ON u.id = IF(mm.user_a_id = ?, mm.user_b_id, mm.user_a_id)
      WHERE mm.user_a_id = ? OR mm.user_b_id = ?
      ORDER BY mm.created_at DESC`,
    [userId, userId, userId],
  );
  const decisions = await query(
    `SELECT u.username, d.decision, d.updated_at
       FROM match_decisions d JOIN users u ON u.id = d.target_id
      WHERE d.actor_id = ? ORDER BY d.updated_at DESC LIMIT 2000`,
    [userId],
  );
  const messages = await query(
    `SELECT conversation_id, message_type, payload, created_at
       FROM chat_messages WHERE sender_id = ? AND deleted_for_everyone = 0
      ORDER BY created_at_ms DESC LIMIT 5000`,
    [userId],
  );
  const blocked = await query(
    "SELECT u.username, b.created_at FROM blocks b JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id = ?",
    [userId],
  );
  const reports = await query("SELECT reason, details, created_at FROM reports WHERE reporter_id = ?", [userId]);

  const strip = (row) => {
    if (!row) return null;
    const { user_id: _u, ...rest } = row;
    for (const key of Object.keys(rest)) rest[key] = parse(rest[key]);
    return rest;
  };
  return {
    exportedAt: new Date().toISOString(),
    app: "Apnajoda",
    account: account || null,
    profile: strip(profile),
    intent: intent || null,
    matchPreferences: strip(preferences),
    photos,
    posts,
    matches,
    likesAndPasses: decisions,
    messagesYouSent: messages.map((m) => ({
      conversation: m.conversation_id,
      type: m.message_type,
      content: parse(m.payload),
      at: m.created_at,
    })),
    blocked,
    reportsYouMade: reports,
  };
}

module.exports = { exportFor };
