/**
 * Server errors never show their insides to the member.
 *
 * The handler used to send err.message for everything, so a failed query
 * showed the member raw SQL - table and column names included. Messages we
 * wrote on purpose still get through; anything unexpected is replaced.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");

process.env.NODE_ENV = "test";

const { ApiError, errorHandler, GENERIC_MESSAGE } = require("../src/middleware/errorHandler");

function run(err) {
  const out = {};
  const res = {
    status(code) {
      out.status = code;
      return this;
    },
    json(body) {
      out.body = body;
      return this;
    },
  };
  const original = console.error;
  console.error = () => undefined;
  try {
    errorHandler(err, { method: "GET", originalUrl: "/x" }, res, () => undefined);
  } finally {
    console.error = original;
  }
  return out;
}

test("a database error is a 500 with a plain message - no SQL", () => {
  const err = new Error("ER_BAD_FIELD_ERROR: Unknown column 'p.secret' in 'field list'");
  err.code = "ER_BAD_FIELD_ERROR";
  const { status, body } = run(err);
  assert.equal(status, 500);
  assert.equal(body.error, GENERIC_MESSAGE);
  assert.doesNotMatch(JSON.stringify(body), /column|ER_|secret/);
});

test("messages we wrote on purpose still reach the member", () => {
  assert.deepEqual(run(new ApiError(404, "This profile is no longer available.")), {
    status: 404,
    body: { error: "This profile is no longer available." },
  });
  assert.equal(run(new ApiError(503, "Payments are not available yet")).body.error, "Payments are not available yet");
});

test("errors marked with .status keep that status instead of becoming a 500", () => {
  const err = Object.assign(new Error("This conversation is not available."), { status: 403 });
  assert.deepEqual(run(err), { status: 403, body: { error: "This conversation is not available." } });
});

test("upload limits are a 400 in plain words", () => {
  const err = Object.assign(new Error("File too large"), { name: "MulterError", code: "LIMIT_FILE_SIZE" });
  assert.deepEqual(run(err), { status: 400, body: { error: "That file is too large." } });
});
