const storyService = require('../services/storyService');

async function run() {
  try {
    const { rows, files } = await storyService.purgeExpired();
    if (rows || files) console.log(`[stories] Deleted ${rows} expired stor${rows === 1 ? 'y' : 'ies'} and ${files} leftover file(s).`);
    return { rows, files };
  } catch (error) {
    console.error('[stories] Cleanup failed:', error);
    return { rows: 0, files: 0 };
  }
}

/**
 * Stories are deleted - row and photo - once their 24 hours are up. This
 * runs right after the server starts and then every 15 minutes, so a story
 * is gone at most 15 minutes after it expires (and the app already stops
 * showing it at 24 hours). Started from server.js.
 */
function start({ firstAfterMs = 5 * 1000, everyMs = 15 * 60 * 1000 } = {}) {
  const first = setTimeout(run, firstAfterMs);
  const timer = setInterval(run, everyMs);
  for (const t of [first, timer]) if (typeof t.unref === 'function') t.unref();
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}

module.exports = { run, start };
