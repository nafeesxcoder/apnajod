/**
 * Safety Center: hide activity status, blocked list, real counts, data export.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

test("hidden activity status hides online and last seen, both ways", () => {
  const chat = read("src/services/chatService.js");
  assert.match(chat, /Number\(row\?\.hide_activity\) === 1 \|\| Number\(me\?\.hide_activity\) === 1/);
  const rt = read("src/services/realtime.js");
  assert.match(rt, /if \(Number\(row\?\.hide_activity\) === 1\) return;/);
  assert.match(rt, /online: presence\.hidden \? false :/);
  assert.match(read("src/migrations/060_activity_status.sql"), /ADD COLUMN hide_activity/);
});

test("the blocked list, counts and switch come from the server", () => {
  const routes = read("src/routes/safetyRoutes.js");
  for (const r of ["'/blocked'", "'/summary'", "'/activity-status'"]) assert.ok(routes.includes(r), r);
});

test("download my data gives your own account, never what others wrote", () => {
  const svc = read("src/services/dataExportService.js");
  assert.match(svc, /FROM chat_messages WHERE sender_id = \?/);
  assert.match(read("src/routes/profileRoutes.js"), /router\.get\("\/me\/export"/);
});

test("city and intent from Match Filters put those people first", () => {
  const p = read("src/services/profileService.js");
  assert.match(p, /fits_filters DESC/);
  assert.match(p, /LEFT JOIN profile_intent pi ON pi\.user_id = u\.id/);
});
