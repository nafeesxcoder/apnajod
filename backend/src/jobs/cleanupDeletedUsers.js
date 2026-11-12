const userService = require('../services/userService');

async function run() {
  try {
    let total = 0;
    // Batches of 200, until none are left.
    for (;;) {
      const deleted = await userService.purgeExpiredDeletedUsers();
      total += deleted;
      if (deleted < 200) break;
    }
    if (total > 0) {
      console.log(`[cleanup] Permanently deleted ${total} account(s) past their 30-day grace period.`);
    }
    return total;
  } catch (error) {
    console.error('[cleanup] Failed to purge expired deleted users:', error);
    return 0;
  }
}

/**
 * Runs the purge a minute after the server starts and then every six
 * hours, so a deleted account is really gone soon after its 30 days - not
 * whenever someone remembers `npm run cleanup`. Started from server.js.
 * Set CLEANUP_DELETED=off in .env to stop it.
 */
function start({ firstAfterMs = 60 * 1000, everyMs = 6 * 60 * 60 * 1000 } = {}) {
  if (String(process.env.CLEANUP_DELETED || '').toLowerCase() === 'off') {
    return () => undefined;
  }
  const first = setTimeout(run, firstAfterMs);
  const timer = setInterval(run, everyMs);
  for (const t of [first, timer]) if (typeof t.unref === 'function') t.unref();
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}

module.exports = { run, start };

// Allow running directly: node src/jobs/cleanupDeletedUsers.js
if (require.main === module) {
  const { pool } = require('../config/db');
  run().finally(() => pool.end());
}
