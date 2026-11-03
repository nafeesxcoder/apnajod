const userService = require('../services/userService');

async function run() {
  try {
    const deletedCount = await userService.purgeExpiredDeletedUsers();
    if (deletedCount > 0) {
      console.log(`[cleanup] Permanently deleted ${deletedCount} account(s) past their 30-day grace period.`);
    } else {
      console.log('[cleanup] No accounts past their 30-day grace period.');
    }
  } catch (error) {
    console.error('[cleanup] Failed to purge expired deleted users:', error);
  }
}

module.exports = { run };

// Allow running directly: node src/jobs/cleanupDeletedUsers.js
if (require.main === module) {
  const { pool } = require('../config/db');
  run().finally(() => pool.end());
}