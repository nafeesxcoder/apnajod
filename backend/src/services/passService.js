const { query } = require("../config/db");
const { PASS_PLANS } = require("../config/passes");

/** The pass a member has right now, or null. */
async function getPass(userId) {
  const [row] = await query(
    `SELECT plan, DATE_FORMAT(expires_at, '%Y-%m-%dT%H:%i:%sZ') AS expiresAt
       FROM admin_passes
      WHERE user_id = ? AND expires_at > UTC_TIMESTAMP(6)`,
    [userId],
  );
  if (!row) return null;
  return {
    plan: row.plan,
    planLabel: PASS_PLANS[row.plan]?.label || row.plan,
    expiresAt: row.expiresAt,
  };
}

/**
 * Give a plan free for some months. A member who already has a pass gets the
 * time added to the end of it. Each feature of the plan runs as long as the
 * pass does, marked source 'pass'. A paid plan that is longer keeps its own
 * source, so a later revoke does not take it away.
 */
async function givePass(adminId, userId, planId, months) {
  const features = PASS_PLANS[planId].features;
  await query(
    `INSERT INTO admin_passes (user_id, plan, expires_at, granted_by)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(6), INTERVAL ? MONTH), ?)
     ON DUPLICATE KEY UPDATE
       plan = VALUES(plan),
       expires_at = DATE_ADD(GREATEST(expires_at, UTC_TIMESTAMP(6)), INTERVAL ? MONTH),
       granted_by = VALUES(granted_by)`,
    [userId, planId, months, adminId ?? null, months],
  );

  // Features the old pass had but this plan does not include end now.
  const marks = features.map(() => "?").join(", ");
  await query(
    `UPDATE entitlements SET expires_at = UTC_TIMESTAMP(6)
      WHERE user_id = ? AND source = 'pass' AND feature NOT IN (${marks})
        AND expires_at > UTC_TIMESTAMP(6)`,
    [userId, ...features],
  );

  for (const feature of features) {
    await query(
      `INSERT INTO entitlements (user_id, feature, expires_at, source)
       SELECT ?, ?, expires_at, 'pass' FROM admin_passes WHERE user_id = ?
       ON DUPLICATE KEY UPDATE
         entitlements.source = IF(entitlements.expires_at IS NULL OR entitlements.expires_at > VALUES(expires_at), entitlements.source, 'pass'),
         entitlements.expires_at = IF(entitlements.expires_at IS NULL, NULL, GREATEST(entitlements.expires_at, VALUES(expires_at)))`,
      [userId, feature, userId],
    );
  }
}

/** Delete the pass: its benefits end now. Paid plans are left alone. */
async function revokePass(userId) {
  await query("DELETE FROM admin_passes WHERE user_id = ?", [userId]);
  await query(
    `UPDATE entitlements SET expires_at = UTC_TIMESTAMP(6)
      WHERE user_id = ? AND source = 'pass' AND expires_at > UTC_TIMESTAMP(6)`,
    [userId],
  );
}

module.exports = { getPass, givePass, revokePass };
