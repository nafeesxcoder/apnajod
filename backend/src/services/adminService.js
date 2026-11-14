const { query } = require("../config/db");
const billingService = require("./billingService");
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
  const [users, newThisWeek, pendingVerifications, verifiedUsers, openReports, suspendedUsers, revenuePaise, openAppeals, blueTickUsers, pendingPayments] =
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
      scalar(
        `SELECT COUNT(*) AS total FROM profiles p
          WHERE p.user_id IN (${live})
            AND ${billingService.blueTickSql("p.user_id", "p.verified")}`,
      ),
      scalar("SELECT COUNT(*) AS total FROM payments WHERE provider = 'upi' AND status = 'pending'"),
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
    blueTickUsers,
    pendingPayments,
  };
}

/** The Users tab's filters: who has what. */
const USER_FILTERS = ["all", "verified", "bluetick", "pro", "paid", "pending"];

/** An entitlement that is live right now (NULL expiry never runs out). */
const live = (feature) => `EXISTS (SELECT 1 FROM entitlements e
     WHERE e.user_id = u.id AND e.feature = '${feature}'
       AND (e.expires_at IS NULL OR e.expires_at > UTC_TIMESTAMP(6)))`;
const until = (feature) => `(SELECT IF(MAX(e.expires_at IS NULL), NULL, MAX(e.expires_at)) FROM entitlements e
     WHERE e.user_id = u.id AND e.feature = '${feature}'
       AND (e.expires_at IS NULL OR e.expires_at > UTC_TIMESTAMP(6)))`;

/**
 * Members for the admin, newest first, with what they have: selfie
 * verified, blue tick, and which paid plan until when. A filter narrows
 * the list on the server, so every Pro or verified member can be found.
 */
async function listUsers(search = "", limit = 200, filter = "all") {
  const PRO = billingService.PRO;
  const PREMIUM = billingService.PREMIUM;
  let sql = `SELECT u.id, u.username, u.full_name, u.phone, u.avatar_url, u.role, u.status, u.created_at,
                    p.first_name, p.age, p.city, p.verified, p.verification_status,
                    ${billingService.blueTickSql("u.id", "p.verified")} AS blue_tick,
                    ${live(PRO)} AS pro,
                    ${live(PREMIUM)} AS plus,
                    ${until(PRO)} AS pro_until,
                    ${until(PREMIUM)} AS plus_until
               FROM users u
               LEFT JOIN profiles p ON p.user_id = u.id
              WHERE u.deleted_at IS NULL`;
  const params = [];

  if (search && search.trim() !== "") {
    sql += " AND (u.username LIKE ? OR u.full_name LIKE ? OR p.first_name LIKE ? OR u.phone LIKE ?)";
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  const which = USER_FILTERS.includes(filter) ? filter : "all";
  if (which === "verified") sql += " AND COALESCE(p.verified, 0) = 1";
  if (which === "bluetick") sql += ` AND ${billingService.blueTickSql("u.id", "p.verified")}`;
  if (which === "pro") sql += ` AND ${live(PRO)}`;
  if (which === "paid") sql += ` AND (${live(PRO)} OR ${live(PREMIUM)})`;
  if (which === "pending") sql += " AND p.verification_status = 'pending'";

  // LIMIT can't be a placeholder with execute(); the number is internal.
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
  sql += ` ORDER BY u.created_at DESC LIMIT ${safeLimit}`;

  // query() returns the rows array itself. "const [rows] =" kept only the
  // first user, so the Users tab and "Recently joined" came back empty.
  const rows = await query(sql, params);
  return rows.map((row) => ({
    ...row,
    verified: Number(row.verified) === 1 ? 1 : 0,
    blue_tick: Number(row.blue_tick) === 1 ? 1 : 0,
    // Pro includes everything Plus has; show the higher plan.
    plan: Number(row.pro) === 1 ? "Pro" : Number(row.plus) === 1 ? "Plus" : null,
    plan_until: Number(row.pro) === 1 ? row.pro_until : Number(row.plus) === 1 ? row.plus_until : null,
  }));
}

async function setUserRole(userId, role) {
  if (!["user", "admin"].includes(role)) throw new Error("Invalid role");
  await query("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
  return { ok: true };
}

module.exports = {
  getDashboardStats,
  listUsers,
  USER_FILTERS,
  setUserRole,
  // Reusing existing logic from other services
  listPendingVerifications: profileService.listPendingVerifications,
  setVerificationStatus: profileService.setVerificationStatus,
  listOpenReports: safetyService.listOpenReports,
  resolveReportsAbout: safetyService.resolveReportsAbout,
  setAccountStatus: safetyService.setAccountStatus,
};
