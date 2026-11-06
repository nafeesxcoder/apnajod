const test = require("node:test");
const assert = require("node:assert");
const { readdirSync, readFileSync, statSync } = require("node:fs");
const { join } = require("node:path");

/**
 * Every service a file uses must be required in that file.
 *
 * matchService called pushService.notifyUser without requiring it. Node does
 * not complain at load time - only when that line runs, which was the moment
 * two people matched. So the app started fine, the tests passed, and the
 * single most important action in a dating app threw ReferenceError in
 * production. A missing require is invisible until the unlucky path runs,
 * so it is checked here instead.
 */
const ROOTS = ["src/services", "src/controllers", "src/routes", "src/middleware"];
const USE = /\b([a-z][A-Za-z0-9]*Service)\s*\./g;

function files(dir, found = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return found;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files(path, found);
    else if (path.endsWith(".js")) found.push(path);
  }
  return found;
}

test("no file uses a service it has not required", () => {
  const offenders = [];
  for (const root of ROOTS) {
    for (const path of files(join(__dirname, "..", root))) {
      const source = readFileSync(path, "utf8");
      // Strip comments so a name mentioned in prose is not read as a use.
      const code = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      const used = new Set();
      let match;
      while ((match = USE.exec(code)) !== null) used.add(match[1]);
      for (const name of used) {
        const declared = new RegExp(
          `(const|let|var)\\s+${name}\\s*=|function\\s+${name}\\b|\\b${name}\\s*:`,
        ).test(code);
        if (!declared) {
          offenders.push(`${path.split("/backend/")[1]}: ${name} is never required`);
        }
      }
    }
  }
  assert.deepStrictEqual(offenders, [], offenders.join("\n"));
});

test("every service module loads on its own", () => {
  const broken = [];
  for (const path of files(join(__dirname, "..", "src/services"))) {
    try {
      require(path);
    } catch (error) {
      broken.push(`${path.split("/backend/")[1]}: ${error.message}`);
    }
  }
  assert.deepStrictEqual(broken, [], broken.join("\n"));
});
