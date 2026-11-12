/**
 * Uploads can never run script on the app's origin.
 *
 * Uploads are served from apnajoda.com/api/uploads - the same origin that
 * keeps the member's login token in the browser. Before this, the saved
 * extension came from the uploaded file name, so "x.html" sent as an
 * "image/png" was saved and served as a web page that could read that token.
 */
const assert = require("node:assert/strict");
const { test, after } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const express = require("express");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

const { extensionFor, PHOTO_TYPES, CHAT_TYPES } = require("../src/utils/uploadTypes");

const created = [];
after(() => {
  for (const file of created) fs.rmSync(file, { force: true });
});

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, "127.0.0.1", () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

test("the saved extension comes from the type, never the file name", () => {
  assert.equal(extensionFor("image/jpeg", PHOTO_TYPES), ".jpg");
  assert.equal(extensionFor("Audio/WebM; codecs=opus", CHAT_TYPES), ".webm");
  assert.equal(extensionFor("video/mp4", CHAT_TYPES), ".mp4");
  assert.equal(extensionFor("image/svg+xml", PHOTO_TYPES), null, "SVG can carry script");
  assert.equal(extensionFor("text/html", CHAT_TYPES), null);
  assert.equal(extensionFor("video/mp4", PHOTO_TYPES), null, "profile photos are photos");
  assert.equal(extensionFor("", CHAT_TYPES), null);
});

async function send(middleware, { type, name }) {
  const app = express();
  app.post("/up", middleware.single("file"), (req, res) => res.json({ name: req.file.filename }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ error: err.message }));
  const { server, base } = await listen(app);
  try {
    const form = new FormData();
    form.append("file", new Blob(["<script>alert(1)</script>"], { type }), name);
    const response = await fetch(`${base}/up`, { method: "POST", body: form });
    const body = await response.json();
    if (body.name) created.push(path.join(__dirname, "..", "uploads", "chat", body.name));
    return { status: response.status, body };
  } finally {
    server.close();
  }
}

test("an .html file claiming to be an image is saved as an image, not a page", async () => {
  const chatUpload = require("../src/middleware/chatUpload");
  const { status, body } = await send(chatUpload, { type: "image/png", name: "evil.html" });
  assert.equal(status, 200);
  assert.match(body.name, /^[0-9a-f-]{36}\.png$/);
});

test("SVG, HTML and unknown types are refused with a 400", async () => {
  const chatUpload = require("../src/middleware/chatUpload");
  for (const [type, name] of [
    ["image/svg+xml", "x.svg"],
    ["text/html", "x.html"],
    ["application/octet-stream", "x.bin"],
  ]) {
    const { status } = await send(chatUpload, { type, name });
    assert.equal(status, 400, type);
  }
});

test("only media files are served, and always sandboxed", async () => {
  const dir = path.join(__dirname, "..", "uploads", "chat");
  fs.mkdirSync(dir, { recursive: true });
  const page = path.join(dir, "old-bad-file.html");
  const svg = path.join(dir, "old-bad-file.svg");
  const photo = path.join(dir, "safe-test-photo.jpg");
  fs.writeFileSync(page, "<script>alert(1)</script>");
  fs.writeFileSync(svg, "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
  fs.writeFileSync(photo, "jpg");
  created.push(page, svg, photo);

  const app = require("../src/app");
  const { server, base } = await listen(app);
  try {
    for (const name of ["old-bad-file.html", "old-bad-file.svg", "OLD-BAD-FILE.HTML"]) {
      const response = await fetch(`${base}/uploads/chat/${name}`);
      assert.equal(response.status, 404, name);
    }
    const ok = await fetch(`${base}/uploads/chat/safe-test-photo.jpg`);
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get("content-security-policy") || "", /sandbox/);
    assert.match(ok.headers.get("content-security-policy") || "", /default-src 'none'/);
  } finally {
    server.close();
  }
});
