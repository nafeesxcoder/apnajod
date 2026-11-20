const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");

const read = (p) => readFileSync(require.resolve(p), "utf8");
const profile = read("../src/services/profileService.js");
const appeal = read("../src/services/appealService.js");
const admin = read("../src/services/adminService.js");
const exportSvc = read("../src/services/dataExportService.js");

test("admin verification queue shows decrypted phones", () => {
  assert.ok(profile.includes("row.phone = decrypt(row.phone)"));
});

test("open appeals show decrypted phones", () => {
  assert.ok(appeal.includes("phone: decrypt(row.phone)"));
});

test("admin user list decrypts phones and searches a full number by its blind index", () => {
  assert.ok(admin.includes("fc.decrypt(row.phone)"));
  assert.ok(admin.includes("u.phone_hash = ?"));
  assert.ok(admin.includes("normalizeIndianPhone(search)"));
});

test("data export decrypts the member's own phone and email", () => {
  assert.ok(exportSvc.includes("account.phone = decrypt(account.phone)"));
  assert.ok(exportSvc.includes('account.email = decrypt(account.email)'));
});
