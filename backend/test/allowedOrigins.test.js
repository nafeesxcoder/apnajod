const test = require("node:test");
const assert = require("node:assert");

/**
 * The live site must be an allowed origin.
 *
 * The defaults still named milaan.in, a brand the app no longer uses, and
 * APP_URL on the server was left at http://localhost:8081. Nothing looked
 * broken: the app and the API share an origin, so the browser applies no
 * CORS to REST and every request kept working. But a WebSocket handshake
 * always carries an Origin header, so socket.io ran its own CORS check,
 * found apnajoda.com nowhere, and sent no Access-Control-Allow-Origin. The
 * browser dropped the socket.
 *
 * What a member saw: no online dot, no read ticks, no live anything - with
 * a healthy server, a clean log and a green deploy.
 */
function loadSecurity(env) {
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  delete require.cache[require.resolve("../src/config/security")];
  delete require.cache[require.resolve("../src/config/env")];
  return require("../src/config/security");
}

test("the live site is allowed even when APP_URL is wrong", () => {
  // Exactly the state the server was in.
  const { isAllowedOrigin } = loadSecurity({
    APP_URL: "http://localhost:8081",
    CORS_ORIGINS: "",
  });
  assert.ok(isAllowedOrigin("https://apnajoda.com"), "apnajoda.com must be allowed");
  assert.ok(
    isAllowedOrigin("https://www.apnajoda.com"),
    "the www host nginx also answers on must be allowed",
  );
});

test("an origin nobody asked for is still refused", () => {
  const { isAllowedOrigin } = loadSecurity({
    APP_URL: "https://apnajoda.com",
    CORS_ORIGINS: "",
  });
  assert.equal(isAllowedOrigin("https://evil.example.com"), false);
});

test("the retired brand is not carried around as an allowed origin", () => {
  const source = require("node:fs").readFileSync(
    require.resolve("../src/config/security"),
    "utf8",
  );
  assert.ok(!source.includes("milaan.in"), "milaan.in is not this app any more");
});

test("CORS_ORIGINS still adds hosts", () => {
  const { isAllowedOrigin } = loadSecurity({
    APP_URL: "https://apnajoda.com",
    CORS_ORIGINS: "https://staging.apnajoda.com",
  });
  assert.ok(isAllowedOrigin("https://staging.apnajoda.com"));
});
