const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");

/**
 * The API is reached only through nginx on this server, so it listens on
 * localhost. Port 4000 is then not reachable from the internet directly.
 */
const server = readFileSync(require.resolve("../src/server.js"), "utf8");
const env = readFileSync(require.resolve("../src/config/env.js"), "utf8");

test("the API listens on localhost by default, behind nginx", () => {
  assert.ok(env.includes('host: process.env.HOST || "127.0.0.1",'));
  assert.ok(server.includes("server.listen(env.port, env.host, () => {"));
});
