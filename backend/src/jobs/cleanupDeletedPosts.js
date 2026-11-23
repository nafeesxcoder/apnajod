const postService = require('../services/postService');

async function run() {
  try {
    const { removed } = await postService.purgeDeletedPosts();
    if (removed) console.log(`[posts] Removed ${removed} post(s) deleted more than 30 days ago.`);
    return { removed };
  } catch (error) {
    console.error('[posts] Cleanup of deleted posts failed:', error);
    return { removed: 0 };
  }
}

/** Posts in Recently deleted are removed for good after 30 days. Started from server.js. */
function start({ firstAfterMs = 60 * 1000, everyMs = 60 * 60 * 1000 } = {}) {
  const first = setTimeout(run, firstAfterMs);
  const timer = setInterval(run, everyMs);
  for (const t of [first, timer]) if (typeof t.unref === 'function') t.unref();
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}

module.exports = { run, start };
