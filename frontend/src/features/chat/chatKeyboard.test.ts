import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(__dirname, "ChatFeature.tsx"), "utf8").replace(/\r\n/g, "\n");

describe("chat keyboard on the web", () => {
  it("never lets the message list's scroll close the keyboard on the web", () => {
    // react-native-web dismisses the keyboard on every scroll event when
    // keyboardDismissMode is "on-drag" - including the scroll the page makes
    // when the keyboard opens - so it must be "none" on the web.
    const block = source.slice(source.indexOf("keyboardDismissMode={"), source.indexOf("keyboardDismissMode={") + 240);
    expect(block).toContain('Platform.OS === "android"');
    expect(block).toContain('"on-drag"');
    expect(block).toMatch(/:\s*"none"/);
    expect(block).not.toMatch(/Platform\.OS === "ios" \? "interactive" : "on-drag"/);
  });
});
