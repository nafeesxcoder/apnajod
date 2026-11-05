/**
 * Make the seeded members like you, so the Likes tab has something in it.
 *
 * Nothing arrives there on its own: seeded accounts never open the app and
 * never swipe, so `match_decisions` stays empty and there is no way to try
 * the accept flow at all.
 *
 * Development only. It refuses to run against NODE_ENV=production.
 *
 * Usage:
 *   npm run seed:likes -- <your-username>        three of them like you
 *   npm run seed:likes -- <your-username> 6      six of them
 */
const crypto = require("crypto");
const env = require("../config/env");
const { pool, query } = require("../config/db");

if (env.nodeEnv === "production") {
  console.error("seed:likes refuses to run with NODE_ENV=production.");
  process.exit(1);
}

async function main() {
  const [handle, countArg] = process.argv.slice(2);
  if (!handle) {
    console.error("Whose Likes tab? e.g. npm run seed:likes -- riya_07");
    process.exitCode = 1;
    return;
  }
  const wanted = Number(countArg) || 3;

  const [target] = await query(
    "SELECT id, username FROM users WHERE username = ? OR id = ? LIMIT 1",
    [handle, handle],
  );
  if (!target) {
    console.error(`No member called "${handle}".`);
    process.exitCode = 1;
    return;
  }

  // Anyone with a finished profile who has not already decided about them.
  const candidates = await query(
    `SELECT u.id, u.username, p.first_name
       FROM users u
       JOIN profiles p ON p.user_id = u.id
      WHERE u.id <> ?
        AND u.deleted_at IS NULL
        AND p.onboarding_complete = 1
        AND NOT EXISTS (
          SELECT 1 FROM match_decisions d
           WHERE d.actor_id = u.id AND d.target_id = ?
        )
      ORDER BY p.updated_at DESC
      LIMIT ${Number(wanted)}`,
    [target.id, target.id],
  );

  if (!candidates.length) {
    console.log(
      `\nNobody left to like ${target.username} — they have all decided already.\n` +
        "Run `npm run seed:dev` for more members, or accept the ones waiting.\n",
    );
    return;
  }

  for (const candidate of candidates) {
    await query(
      `INSERT INTO match_decisions (id, actor_id, target_id, decision)
       VALUES (?, ?, ?, 'interested')
       ON DUPLICATE KEY UPDATE decision = 'interested'`,
      [crypto.randomUUID(), candidate.id, target.id],
    );
    console.log(`  ${candidate.first_name || candidate.username} liked ${target.username}`);
  }

  console.log(
    `\n${candidates.length} waiting in ${target.username}'s Likes tab. ` +
      "Open the app, accept one, and the chat opens.\n",
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
