const { query } = require("../config/db");
const safetyService = require("./safetyService");
const profileService = require("./profileService");

async function getDashboardStats() {
  // Note: query returns [rows, fields] usually, so destructure carefully
  const [usersResult] = await query(
    "SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL",
  );
  const [pendingResult] = await query(
    "SELECT COUNT(*) as total FROM profiles WHERE verification_status = 'pending' AND user_id IN (SELECT id FROM users WHERE deleted_at IS NULL)",
  );
  const [revenueResult] = await query(
    "SELECT SUM(amount_paise) as total FROM payments WHERE status = 'paid'",
  );

  return {
    users: Number(usersResult?.[0]?.total || 0),
    pendingVerifications: Number(pendingResult?.[0]?.total || 0),
    revenuePaise: Number(revenueResult?.[0]?.total || 0),
  };
}

async function listUsers(search = "", limit = 50) {
  let sql =
    "SELECT id, username, full_name, avatar_url, role, status, created_at FROM users WHERE deleted_at IS NULL";
  let params = [];

  if (search && search.trim() !== "") {
    sql += " AND (username LIKE ? OR full_name LIKE ?)";
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  // MySQL prepared statements LIMIT ? ko support nahi karte, isliye direct number daal rahe hain (safe because limit is internal)
  const safeLimit = Number(limit) || 50;
  sql += ` ORDER BY created_at DESC LIMIT ${safeLimit}`;

  // query function [rows, fields] return karta hai, isliye sirf rows nikaal rahe hain
  const [rows] = await query(sql, params);
  return rows;
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
