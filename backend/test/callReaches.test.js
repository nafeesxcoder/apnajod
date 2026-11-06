const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");
const path = require("node:path");

/**
 * A call has to reach the other person.
 *
 * startCall only sent a web push. Push needs VAPID keys, there are none
 * configured, so notifyUser was a no-op and the callee's phone never rang -
 * on a dating app, the call button did nothing at all and looked like it
 * had worked. The socket is the channel that is actually connected, so the
 * call goes there too.
 */
function loadCallService({ emits, rows }) {
  const original = Module.prototype.require;
  Module.prototype.require = function patched(id) {
    if (id === "../config/db") {
      return {
        query: async (sql) => {
          if (/^SELECT \* FROM calls/i.test(sql.trim())) return rows.call;
          if (/FROM profiles/i.test(sql)) return [{ first_name: "Asha" }];
          return [];
        },
      };
    }
    if (id === "./realtime") {
      return {
        emitToUser: (userId, event, payload) => emits.push({ userId, event, payload }),
      };
    }
    if (id === "./pushService") return { notifyUser: async () => undefined };
    if (id === "./chatService") {
      return { assertParticipant: async (peerId, userId) => [userId, peerId] };
    }
    return original.apply(this, arguments);
  };
  delete require.cache[require.resolve("../src/services/callService.js")];
  const service = require("../src/services/callService.js");
  Module.prototype.require = original;
  return service;
}

test("starting a call rings the callee over the socket", async () => {
  const emits = [];
  const service = loadCallService({ emits, rows: { call: [] } });
  await service.startCall("callee-1", "caller-1", "audio");

  const ring = emits.find((e) => e.event === "call:incoming");
  assert.ok(ring, "no call:incoming was emitted, so nothing rings");
  assert.strictEqual(ring.userId, "callee-1");
  assert.strictEqual(ring.payload.callerId, "caller-1");
  assert.strictEqual(ring.payload.callerName, "Asha");
  assert.strictEqual(ring.payload.mode, "audio");
  assert.ok(ring.payload.callId, "the callee needs the call id to answer");
});

test("answering tells the caller, who is staring at a ringing screen", async () => {
  const emits = [];
  const service = loadCallService({
    emits,
    rows: {
      call: [
        {
          id: "c1",
          caller_id: "caller-1",
          callee_id: "callee-1",
          status: "ringing",
        },
      ],
    },
  });
  await service.respondToCall("c1", "callee-1", true);

  const answered = emits.find((e) => e.event === "call:responded");
  assert.ok(answered, "the caller is never told the call was answered");
  assert.strictEqual(answered.userId, "caller-1");
  assert.strictEqual(answered.payload.status, "accepted");
});

test("hanging up tells the other side", async () => {
  const emits = [];
  const service = loadCallService({
    emits,
    rows: {
      call: [
        {
          id: "c1",
          caller_id: "caller-1",
          callee_id: "callee-1",
          status: "accepted",
        },
      ],
    },
  });
  await service.endCall("c1", "caller-1", "hangup");

  const ended = emits.find((e) => e.event === "call:ended");
  assert.ok(ended, "the other side is left on a dead call");
  assert.strictEqual(ended.userId, "callee-1");
});
