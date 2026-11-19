/**
 * /health is what an uptime monitor calls: 200 while the server and the
 * database answer, 503 when the database does not.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const http = require("node:http");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

const db = require("../src/config/db");
const app = require("../src/app");

async function get(path) {
  const server = http.createServer(app).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`);
    return { status: response.status, body: await response.json() };
  } finally {
    server.close();
  }
}

test("health: 200 when the database answers", async () => {
  const real = db.query;
  db.query = async () => [{ 1: 1 }];
  try {
    assert.deepEqual(await get("/health"), { status: 200, body: { ok: true } });
  } finally {
    db.query = real;
  }
});

test("health: 503 when the database does not", async () => {
  const real = db.query;
  db.query = async () => {
    throw new Error("ECONNREFUSED");
  };
  try {
    const { status, body } = await get("/health");
    assert.equal(status, 503);
    assert.equal(body.ok, false);
  } finally {
    db.query = real;
  }
});
