const { query } = require("../config/db");
const safetyService = require("./safetyService");
const profileService = require("./profileService");

/** One number from a COUNT/SUM query; 0 if the table is missing or empty. */
async function scalar(sql, params = []) {
  try {
    const rows = await query(sql, params);
    return Number(rows?.[0]?.total || 0);
  } catch (error) {
    // e.g. payments table not migrated yet: show 0 rather than break the page.
    console.log("[ADMIN STATS] query failed:", error.message);
    return 0;
  }
}

async function getDashboardStats() {
  // query() already returns the rows array, so rows[0] is the result row.
  // Destructuring it again read rows[0][0], which is always undefined, and
  // every card on the dashboard showed 0.
  const live = "SELECT id FROM users WHERE deleted_at IS NULL";
  const [users, newThisWeek, pendingVerifications, verifiedUsers, openReports, suspendedUsers, revenuePaise, openAppeals] =
    await Promise.all([
      scalar("SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL"),
      scalar(
        "SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL 7 DAY",
      ),
      scalar(
        `SELECT COUNT(*) AS total FROM profiles WHERE verification_status = 'pending' AND user_id IN (${live})`,
      ),
      scalar(
        `SELECT COUNT(*) AS total FROM profiles WHERE verified = 1 AND user_id IN (${live})`,
      ),
      scalar(
        `SELECT COUNT(DISTINCT reported_id) AS total FROM reports WHERE review_status = 'open' AND reported_id IN (${live})`,
      ),
      scalar(
        "SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND status = 'suspended'",
      ),
      scalar("SELECT SUM(amount_paise) AS total FROM payments WHERE status = 'paid'"),
      scalar("SELECT COUNT(*) AS total FROM account_appeals WHERE status = 'open'"),
    ]);

  return {
    users,
    newThisWeek,
    pendingVerifications,
    verifiedUsers,
    openReports,
    suspendedUsers,
    revenuePaise,
    openAppeals,
  };
}

async function listUsers(search = "", limit = 50) {
  let sql = `SELECT u.id, u.username, u.full_name, u.phone, u.avatar_url, u.role, u.status, u.created_at,
                    p.first_name, p.age, p.city, p.verified
               FROM users u
               LEFT JOIN profiles p ON p.user_id = u.id
              WHERE u.deleted_at IS NULL`;
  const params = [];

  if (search && search.trim() !== "") {
    sql += " AND (u.username LIKE ? OR u.full_name LIKE ? OR p.first_name LIKE ? OR u.phone LIKE ?)";
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  // LIMIT can't be a placeholder with execute(); the number is internal.
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  sql += ` ORDER BY u.created_at DESC LIMIT ${safeLimit}`;

  // query() returns the rows array itself. "const [rows] =" kept only the
  // first user, so the Users tab and "Recently joined" came back empty.
  return query(sql, params);
}

async function setUserRole(userId, role) {
  if (!["user", "admin"].includes(role)) throw new Error("Invalid role");
  await query("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
  return { ok: true };
}

module.exports = {
  getDashboardStats,
  listUsers,
  setUserRole,
  // Reusing existing logic from other services
  listPendingVerifications: profileService.listPendingVerifications,
  setVerificationStatus: profileService.setVerificationStatus,
  listOpenReports: safetyService.listOpenReports,
  resolveReportsAbout: safetyService.resolveReportsAbout,
  setAccountStatus: safetyService.setAccountStatus,
};
