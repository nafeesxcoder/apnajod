const test = require("node:test");
const assert = require("node:assert");

/**
 * The admin's plan edits: what is accepted, and what is refused with a
 * message the admin can read.
 */
const { validate } = require("../src/services/planAdminService");

test("a sensible price, title and on/off switch are accepted", () => {
  assert.deepStrictEqual(
    validate({ title: "  Pro  ", amountPaise: 24900, active: false }),
    { title: "Pro", amount_paise: 24900, active: 0 },
  );
});

test("the price must be a whole number of paise between Rs 1 and Rs 10,000", () => {
  assert.throws(() => validate({ amountPaise: 99.5 }), /between Rs 1 and Rs 10,000/);
  assert.throws(() => validate({ amountPaise: 50 }), /between Rs 1 and Rs 10,000/);
  assert.throws(() => validate({ amountPaise: 1000001 }), /between Rs 1 and Rs 10,000/);
  assert.deepStrictEqual(validate({ amountPaise: 100 }), { amount_paise: 100 });
});

test("the title cannot be empty or longer than 80 characters", () => {
  assert.throws(() => validate({ title: "   " }), /1 to 80/);
  assert.throws(() => validate({ title: "x".repeat(81) }), /1 to 80/);
});

test("an empty description is saved as no description", () => {
  assert.deepStrictEqual(validate({ blurb: "   " }), { blurb: null });
  assert.throws(() => validate({ blurb: "x".repeat(161) }), /160 characters/);
});

test("a Google Play product id is lowercase letters, numbers, _ and . only", () => {
  assert.deepStrictEqual(validate({ playProductId: "pro_monthly" }), { play_product_id: "pro_monthly" });
  assert.deepStrictEqual(validate({ playProductId: "" }), { play_product_id: null });
  assert.throws(() => validate({ playProductId: "Pro Monthly" }), /small letters/);
  assert.throws(() => validate({ playProductId: "x".repeat(41) }), /small letters/);
});

test("fields that were not sent are left alone", () => {
  assert.deepStrictEqual(validate({}), {});
  assert.deepStrictEqual(validate({ active: true }), { active: 1 });
});

test("a duplicate Play product id is refused before the plan is changed", async () => {
  const dbPath = require.resolve("../src/config/db");
  const calls = [];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query: async (sql, params = []) => {
        calls.push(sql);
        if (/SELECT code FROM billing_plans WHERE code = \?/.test(sql)) return [{ code: "pro_monthly" }];
        if (/WHERE play_product_id = \? AND code <> \?/.test(sql)) return [{ code: "plus_monthly" }];
        throw new Error(`unexpected SQL: ${sql} ${params}`);
      },
    },
  };
  delete require.cache[require.resolve("../src/services/planAdminService")];
  const service = require("../src/services/planAdminService");

  await assert.rejects(
    () => service.update("pro_monthly", { playProductId: "plus_monthly" }),
    (error) => error.status === 409 && /already used by plus_monthly/.test(error.message),
  );
  assert.ok(!calls.some((sql) => /^UPDATE/.test(sql)));
  delete require.cache[dbPath];
});
