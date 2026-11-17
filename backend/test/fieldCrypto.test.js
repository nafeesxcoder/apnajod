// The key must be set before the config module loads.
process.env.APP_ENC_KEY = Buffer.alloc(32, 7).toString("base64");

const test = require("node:test");
const assert = require("node:assert");
const fc = require("../src/services/fieldCrypto");

test("encrypt then decrypt returns the original value", () => {
  assert.strictEqual(fc.decrypt(fc.encrypt("9876543210")), "9876543210");
  assert.strictEqual(fc.decrypt(fc.encrypt("someone@example.com")), "someone@example.com");
});

test("ciphertext is prefixed, hides the plain value and changes every time", () => {
  const a = fc.encrypt("9876543210");
  const b = fc.encrypt("9876543210");
  assert.ok(a.startsWith("v1:"));
  assert.ok(!a.includes("9876543210"));
  assert.notStrictEqual(a, b);
  assert.ok(fc.isEncrypted(a));
});

test("a tampered ciphertext is rejected", () => {
  const c = fc.encrypt("9876543210");
  const buf = Buffer.from(c.slice(3), "base64");
  buf[buf.length - 1] ^= 1;
  assert.throws(() => fc.decrypt("v1:" + buf.toString("base64")));
});

test("values without the prefix pass through decrypt unchanged", () => {
  assert.strictEqual(fc.decrypt("9876543210"), "9876543210");
  assert.strictEqual(fc.isEncrypted("9876543210"), false);
});

test("null and undefined stay null", () => {
  assert.strictEqual(fc.encrypt(null), null);
  assert.strictEqual(fc.decrypt(null), null);
  assert.strictEqual(fc.blindIndex("phone", null), null);
});

test("blind index is deterministic and 64 hex characters", () => {
  const a = fc.blindIndex("phone", "9876543210");
  assert.strictEqual(a, fc.blindIndex("phone", "9876543210"));
  assert.match(a, /^[0-9a-f]{64}$/);
});

test("blind index ignores spaces in phones and case and spaces in emails", () => {
  assert.strictEqual(fc.blindIndex("phone", "98765 43210"), fc.blindIndex("phone", "9876543210"));
  assert.strictEqual(
    fc.blindIndex("email", "  Someone@Example.com "),
    fc.blindIndex("email", "someone@example.com"),
  );
});

test("blind index differs for different values and for different kinds", () => {
  assert.notStrictEqual(fc.blindIndex("phone", "9876543210"), fc.blindIndex("phone", "9876543211"));
  assert.notStrictEqual(fc.blindIndex("phone", "a@b.com"), fc.blindIndex("email", "a@b.com"));
});

test("unknown blind index kinds are refused", () => {
  assert.throws(() => fc.blindIndex("username", "x"));
});
