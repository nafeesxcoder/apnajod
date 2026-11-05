/**
 * Work through the selfie verification queue by hand.
 *
 * Submitting a selfie only sets `verification_status = 'pending'`. Something
 * has to move it, or nobody is ever verified and the badge the whole app
 * rests on never appears. Until there are enough members for that to be a
 * real job, a person doing it from a terminal is the right amount of
 * machinery: no admin login to secure, no panel to keep working.
 *
 * Usage:
 *   npm run verify                      list everyone waiting
 *   npm run verify -- approve <user>    mark them verified
 *   npm run verify -- reject  <user>    send them back to try again
 *
 * <user> is a username or a user id. Open the selfie URL the list prints
 * before deciding — the point of this is that a human looks.
 */
const env = require("../config/env");
const { pool, query } = require("../config/db");
const profileService = require("../services/profileService");

/** Accept either a username or a raw user id, so you can paste from anywhere. */
async function resolveUser(handle) {
  const [row] = await query(
    "SELECT id, username FROM users WHERE username = ? OR id = ? LIMIT 1",
    [handle, handle],
  );
  return row || null;
}

/** The selfie is stored as a path; show something openable. */
function selfieLink(selfieUri) {
  if (!selfieUri) return "(no selfie on file)";
  if (/^https?:\/\//i.test(selfieUri)) return selfieUri;
  // Rows written before the selfie was actually uploaded hold a reference
  // that only the member's own device can resolve. Say so rather than
  // printing a link that will not open.
  if (/^(file|blob|content|ph):/i.test(selfieUri)) {
    return `(not uploaded — stored as "${selfieUri.slice(0, 40)}…", ask them to submit again)`;
  }
  return `${env.apiUrl.replace(/\/$/, "")}/${selfieUri.replace(/^\//, "")}`;
}

async function list() {
  const pending = await profileService.listPendingVerifications();
  if (!pending.length) {
    console.log("\nNobody is waiting for verification.\n");
    return;
  }
  console.log(`\n${pending.length} waiting:\n`);
  for (const p of pending) {
    const who = [p.first_name, p.age || null, p.city || null]
      .filter(Boolean)
      .join(" · ");
    console.log(`  ${p.username}`);
    console.log(`    ${who || "(profile incomplete)"}`);
    console.log(`    selfie: ${selfieLink(p.selfie_uri)}`);
    console.log(`    waiting since: ${p.updated_at}`);
    console.log("");
  }
  console.log("Look at the selfie, then:");
  console.log(`  npm run verify -- approve ${pending[0].username}`);
  console.log(`  npm run verify -- reject  ${pending[0].username}\n`);
}

async function decide(action, handle) {
  if (!handle) {
    console.error(`Which member? e.g. npm run verify -- ${action} riya_07`);
    process.exitCode = 1;
    return;
  }
  const user = await resolveUser(handle);
  if (!user) {
    console.error(`No member called "${handle}".`);
    process.exitCode = 1;
    return;
  }
  const status = action === "approve" ? "approved" : "rejected";
  await profileService.setVerificationStatus(user.id, status);
  console.log(
    action === "approve"
      ? `\n${user.username} is verified. The badge shows on their profile now.\n`
      : `\n${user.username} was rejected. They can upload another selfie.\n`,
  );
}

async function main() {
  const [action, handle] = process.argv.slice(2);
  if (!action || action === "list") return list();
  if (action === "approve" || action === "reject") return decide(action, handle);
  console.error(
    `Unknown command "${action}". Use: list, approve <user>, reject <user>.`,
  );
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
