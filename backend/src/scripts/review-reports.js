/**
 * Work through the reports people have filed.
 *
 * Reporting wrote a row and nothing read it, so a complaint went nowhere.
 * Blocking already protects the person who reported — it is immediate and
 * cuts both directions — but nobody was looking at whether an account kept
 * doing it to others, which is the part a block cannot fix.
 *
 * Grouped by the account reported, not by report: three complaints about one
 * person is the signal, and a flat list hides it.
 *
 * Usage:
 *   npm run reports                     who has been reported, worst first
 *   npm run reports -- show <user>      every complaint about them, in full
 *   npm run reports -- suspend <user>   sign them out and keep them out
 *   npm run reports -- dismiss <user>   close the reports, no action
 *   npm run reports -- restore <user>   undo a suspension
 *
 * Suspending ends their sessions immediately and blocks login; dismissing
 * only clears the queue. Both close the open reports so the list stays the
 * work that is left.
 */
const { pool, query } = require("../config/db");
const safetyService = require("../services/safetyService");

async function resolveUser(handle) {
  const [row] = await query(
    "SELECT id, username, status FROM users WHERE username = ? OR id = ? LIMIT 1",
    [handle, handle],
  );
  return row || null;
}

async function list() {
  const queue = await safetyService.listOpenReports();
  if (!queue.length) {
    console.log("\nNo open reports.\n");
    return;
  }
  console.log(`\n${queue.length} account${queue.length === 1 ? "" : "s"} reported:\n`);
  for (const row of queue) {
    const flag = row.account_status === "suspended" ? "  [SUSPENDED]" : "";
    console.log(`  ${row.reported_username}${flag}`);
    console.log(
      `    ${[row.reported_name, row.reported_city].filter(Boolean).join(" · ") || "(no profile)"}`,
    );
    console.log(`    ${row.report_count} report${row.report_count === 1 ? "" : "s"}: ${row.reasons}`);
    console.log(`    last reported: ${row.last_reported_at}`);
    console.log("");
  }
  console.log("Read one in full, then decide:");
  console.log(`  npm run reports -- show    ${queue[0].reported_username}`);
  console.log(`  npm run reports -- suspend ${queue[0].reported_username}`);
  console.log(`  npm run reports -- dismiss ${queue[0].reported_username}\n`);
}

async function show(handle) {
  const user = await resolveUser(handle);
  if (!user) return notFound(handle);
  const reports = await safetyService.listReportsAbout(user.id);
  if (!reports.length) {
    console.log(`\nNothing has been reported about ${user.username}.\n`);
    return;
  }
  console.log(`\n${reports.length} report${reports.length === 1 ? "" : "s"} about ${user.username} (account: ${user.status}):\n`);
  for (const report of reports) {
    console.log(`  ${report.created_at} — by ${report.reporter_username} [${report.review_status}]`);
    console.log(`    reason: ${report.reason}`);
    if (report.details) console.log(`    details: ${report.details}`);
    console.log("");
  }
}

async function decide(action, handle) {
  const user = await resolveUser(handle);
  if (!user) return notFound(handle);

  if (action === "restore") {
    await safetyService.setAccountStatus(user.id, "active");
    console.log(`\n${user.username} can sign in again.\n`);
    return;
  }

  if (action === "suspend") {
    await safetyService.setAccountStatus(user.id, "suspended");
  }
  const { closed } = await safetyService.resolveReportsAbout(
    user.id,
    action === "suspend" ? "actioned" : "dismissed",
  );
  console.log(
    action === "suspend"
      ? `\n${user.username} is suspended — signed out now, and login is refused. ${closed} report${closed === 1 ? "" : "s"} closed.\n`
      : `\n${closed} report${closed === 1 ? "" : "s"} about ${user.username} closed with no action.\n`,
  );
}

function notFound(handle) {
  console.error(`No member called "${handle}".`);
  process.exitCode = 1;
}

async function main() {
  const [action, handle] = process.argv.slice(2);
  if (!action || action === "list") return list();
  if (!["show", "suspend", "dismiss", "restore"].includes(action)) {
    console.error(
      `Unknown command "${action}". Use: list, show <user>, suspend <user>, dismiss <user>, restore <user>.`,
    );
    process.exitCode = 1;
    return;
  }
  if (!handle) {
    console.error(`Which member? e.g. npm run reports -- ${action} riya_07`);
    process.exitCode = 1;
    return;
  }
  if (action === "show") return show(handle);
  return decide(action, handle);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
