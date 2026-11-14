const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");

/**
 * Festival themes: one click puts a theme on the whole app, a schedule puts
 * it on and takes it off by itself, and members online hear about it.
 */
function load(onQuery, emitted) {
  const original = Module.prototype.require;
  Module.prototype.require = function patched(id) {
    if (id === "../config/db") return { query: async (sql, params) => onQuery(sql.replace(/\s+/g, " ").trim(), params) };
    if (id === "./realtime") return { emitToAll: (event, payload) => emitted.push({ event, payload }) };
    return original.apply(this, arguments);
  };
  delete require.cache[require.resolve("../src/services/festivalService.js")];
  const service = require("../src/services/festivalService.js");
  Module.prototype.require = original;
  return service;
}

test("apply now: ends the old theme, starts the new one, tells everyone", async () => {
  const sqls = [];
  const emitted = [];
  const service = load(async (sql, params) => {
    sqls.push({ sql, params });
    if (sql.startsWith("SELECT * FROM festival_schedule WHERE cancelled_at IS NULL AND starts_at <= UTC_TIMESTAMP()")) {
      return [{ id: "f1", theme_key: "diwali", greeting: "Shubh Deepavali", starts_at: "2026-11-14 10:00:00", ends_at: null }];
    }
    return { affectedRows: 1 };
  }, emitted);
  const result = await service.schedule("admin-1", { themeKey: "diwali", greeting: "  Shubh   Deepavali " });
  assert.strictEqual(result.startsNow, true);
  assert.ok(sqls[0].sql.startsWith("UPDATE festival_schedule SET ends_at = UTC_TIMESTAMP()"), "old theme ended first");
  const insert = sqls.find((q) => q.sql.startsWith("INSERT INTO festival_schedule"));
  assert.strictEqual(insert.params[1], "diwali");
  assert.strictEqual(insert.params[2], "Shubh Deepavali");
  assert.strictEqual(insert.params[4], null, "no end: on until turned off");
  assert.strictEqual(emitted[0].event, "app:theme");
  assert.strictEqual(emitted[0].payload.theme.themeKey, "diwali");
  assert.strictEqual(emitted[0].payload.theme.startsAt, "2026-11-14T10:00:00.000Z");
});

test("a schedule ahead of time is stored in UTC and announced only when it starts", async () => {
  const sqls = [];
  const emitted = [];
  const service = load(async (sql, params) => {
    sqls.push({ sql, params });
    return { affectedRows: 1 };
  }, emitted);
  const start = new Date(Date.now() + 3 * 86400000);
  const end = new Date(start.getTime() + 2 * 86400000);
  const result = await service.schedule("admin-1", { themeKey: "eid_ul_fitr", startsAt: start.toISOString(), endsAt: end.toISOString() });
  assert.strictEqual(result.startsNow, false);
  assert.strictEqual(sqls.length, 1, "nothing else ended");
  assert.strictEqual(sqls[0].params[3], service.sqlUtc(start));
  assert.strictEqual(sqls[0].params[4], service.sqlUtc(end));
  assert.strictEqual(emitted.length, 0);
});

test("bad themes and bad dates are refused", async () => {
  const service = load(async () => ({ affectedRows: 1 }), []);
  await assert.rejects(service.schedule("a", { themeKey: "halloween" }), (e) => e.status === 400);
  const now = Date.now();
  await assert.rejects(
    service.schedule("a", { themeKey: "holi", startsAt: new Date(now + 86400000).toISOString(), endsAt: new Date(now + 3600000).toISOString() }),
    (e) => e.status === 400,
  );
  await assert.rejects(
    service.schedule("a", { themeKey: "holi", endsAt: new Date(now + 90 * 86400000).toISOString() }),
    (e) => e.status === 400,
  );
});

test("turn off ends the theme and tells everyone there is none", async () => {
  const emitted = [];
  const service = load(async (sql) => (sql.startsWith("SELECT") ? [] : { affectedRows: 1 }), emitted);
  await service.stop();
  assert.deepStrictEqual(emitted, [{ event: "app:theme", payload: { theme: null } }]);
});

test("the theme keys match the app's themes", () => {
  const fs = require("node:fs");
  const app = fs.readFileSync(require.resolve("../../frontend/src/features/festival/themes.ts"), "utf8");
  const service = load(async () => [], []);
  for (const key of service.THEME_KEYS) assert.ok(app.includes(`  ${key}: {`), key);
});

test("a festival offer takes its percent off, in whole rupees", () => {
  const billing = require("../src/services/billingService.js");
  assert.strictEqual(billing.offerPrice(9900, 20), 7900);
  assert.strictEqual(billing.offerPrice(19900, 30), 13900);
  assert.strictEqual(billing.offerPrice(9900, 0), 9900);
  assert.strictEqual(billing.offerPrice(100, 50), 100, "never below one rupee");
});

test("offers are 0 to 50 percent", async () => {
  const service = load(async () => ({ affectedRows: 1 }), []);
  await assert.rejects(service.schedule("a", { themeKey: "diwali", offerPercent: 80 }), (e) => e.status === 400);
  const sqls = [];
  const ok = load(async (sql, params) => {
    sqls.push({ sql, params });
    return sql.startsWith("SELECT") ? [] : { affectedRows: 1 };
  }, []);
  await ok.schedule("a", { themeKey: "diwali", offerPercent: 20 });
  const insert = sqls.find((q) => q.sql.startsWith("INSERT INTO festival_schedule"));
  assert.strictEqual(insert.params[6], 20);
});

test("the greeting push goes once per festival", async () => {
  let claimed = false;
  const service = load(async (sql) => {
    if (sql.startsWith("SELECT * FROM festival_schedule WHERE cancelled_at IS NULL AND starts_at <= UTC_TIMESTAMP()")) {
      return [{ id: "f1", theme_key: "eid_ul_fitr", greeting: null, starts_at: "2027-03-10 00:00:00", ends_at: null }];
    }
    if (sql.startsWith("UPDATE festival_schedule SET pushed_at")) {
      if (claimed) return { affectedRows: 0 };
      claimed = true;
      return { affectedRows: 1 };
    }
    if (sql.includes("FROM device_push_tokens")) return [];
    return [];
  }, []);
  const first = await service.sendGreetingPush("");
  assert.strictEqual(first.sending, 0);
  await assert.rejects(service.sendGreetingPush(""), (e) => e.status === 409);
});
