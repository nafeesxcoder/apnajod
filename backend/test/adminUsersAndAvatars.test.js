/**
 * Admin's Users tab knows who has what, and chats show a face.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const admin = read("src/services/adminService.js");

test("the admin can list members by what they have", () => {
  const { USER_FILTERS } = require("../src/services/adminService");
  assert.deepEqual(USER_FILTERS, ["all", "verified", "bluetick", "pro", "paid", "pending"]);
  assert.match(admin, /if \(which === "bluetick"\) sql \+= ` AND \$\{billingService\.blueTickSql\("u\.id", "p\.verified"\)\}`/);
  assert.match(admin, /plan: Number\(row\.pro\) === 1 \? "Pro" : Number\(row\.plus\) === 1 \? "Plus" : null/);
  assert.match(read("src/controllers/adminController.js"), /String\(req\.query\.filter \|\| "all"\)/);
});

test("chats and people lists use the first profile photo", () => {
  const photo = /COALESCE\(\(SELECT ph\.photo_url FROM profile_photos ph WHERE ph\.user_id = u\.id ORDER BY ph\.position ASC LIMIT 1\), u\.avatar_url\) AS avatar_url/;
  assert.match(read("src/services/chatService.js"), photo);
  const follow = read("src/services/followService.js");
  assert.equal((follow.match(new RegExp(photo.source, "g")) || []).length, 3);
});
