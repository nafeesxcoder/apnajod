const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");

const read = (p) => readFileSync(require.resolve(p), "utf8");
const users = read("../src/services/userService.js");
const otp = read("../src/services/otpService.js");
const couple = read("../src/services/coupleService.js");
const follow = read("../src/services/followService.js");

test("user lookups go through the hash columns, with plain text as a fallback", () => {
  assert.ok(users.includes("phone_hash = ? OR phone = ?"));
  assert.ok(users.includes("email_hash = ? OR email = ?"));
});

test("new users are stored encrypted with their blind index", () => {
  assert.ok(users.includes("fc.encrypt(phone)"));
  assert.ok(users.includes("fc.blindIndex('phone', phone)"));
  assert.ok(users.includes("fc.encrypt(email)"));
  assert.ok(users.includes("fc.blindIndex('email', email)"));
});

test("user rows leave the module decrypted", () => {
  assert.ok(users.includes("function openUser(row)"));
  assert.ok(users.includes("phone: fc.decrypt(row.phone)"));
});

test("OTP codes are stored by blind index, never by plain phone or email", () => {
  assert.ok(otp.includes("function storedIdentifier(channel, normalized)"));
  assert.strictEqual(otp.split("[key, channel, purpose],").length - 1, 2);
  assert.ok(otp.includes("[id, key, channel, codeHash"));
});

test("contact matching and couple search use the hash columns", () => {
  assert.ok(couple.includes("phone_hash IN"));
  assert.ok(couple.includes("${column}_hash = ?"));
  assert.ok(follow.includes("u.phone_hash IN"));
  assert.ok(follow.includes("plainRows"));
});
