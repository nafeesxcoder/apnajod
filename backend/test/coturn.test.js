const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const Module = require("node:module");

/**
 * Calls relay through our own free TURN server (coturn) when two phones
 * cannot reach each other directly. coturn checks the password itself:
 * HMAC-SHA1 of the username with the shared secret, and the username
 * starts with the time it expires.
 */
function loadCallService() {
  const original = Module.prototype.require;
  Module.prototype.require = function patched(id) {
    if (id === "../config/db") return { query: async () => [] };
    if (id === "./realtime") return { emitToUser: () => undefined };
    if (id === "./pushService") return { notifyUser: async () => undefined };
    if (id === "./chatService") return {};
    return original.apply(this, arguments);
  };
  delete require.cache[require.resolve("../src/services/callService.js")];
  const service = require("../src/services/callService.js");
  Module.prototype.require = original;
  return service;
}

test("no TURN server set up: nothing from coturn", () => {
  delete process.env.TURN_HOST;
  delete process.env.TURN_SECRET;
  assert.strictEqual(loadCallService().coturnServers("u1"), null);
});

test("coturn credentials are ones coturn will accept, and last a day", async () => {
  process.env.TURN_HOST = "31.42.125.109";
  process.env.TURN_SECRET = "test-secret";
  try {
    const service = loadCallService();
    const servers = service.coturnServers("u1");
    const turn = servers.find((s) => s.username);
    assert.ok(turn.urls.includes("turn:31.42.125.109:3478?transport=udp"));
    assert.ok(turn.urls.includes("turn:31.42.125.109:3478?transport=tcp"));
    const [expires, user] = turn.username.split(":");
    assert.strictEqual(user, "u1");
    const left = Number(expires) - Date.now() / 1000;
    assert.ok(left > 23 * 3600 && left <= 24 * 3600 + 1);
    const expected = crypto.createHmac("sha1", "test-secret").update(turn.username).digest("base64");
    assert.strictEqual(turn.credential, expected);

    // And it is what the app is handed, ahead of Twilio or plain STUN.
    const { iceServers } = await service.getIceServers("u1");
    assert.deepStrictEqual(iceServers.map((s) => s.urls), servers.map((s) => s.urls));
  } finally {
    delete process.env.TURN_HOST;
    delete process.env.TURN_SECRET;
  }
});
