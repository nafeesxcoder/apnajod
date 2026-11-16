import { readdirSync, readFileSync } from "node:fs";
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

describe("chat keyboard on Android", () => {
  const inset = readFileSync(join(__dirname, "../../layout/useKeyboardInset.ts"), "utf8");

  it("lifts the chat box by the keyboard's height on Android", () => {
    // Edge-to-edge Android does not shrink the window for the keyboard, and
    // the composer's KeyboardAvoidingView with "height" left the box hidden
    // under the keyboard, so you could not see what you were typing.
    expect(inset).toContain('Platform.OS === "android"');
    expect(inset).toContain('Keyboard.addListener("keyboardDidShow"');
    expect(inset).toContain('Keyboard.addListener("keyboardDidHide"');
    expect(source).toContain('behavior={Platform.OS === "ios" ? "padding" : undefined}');
    expect(source).toContain("{ paddingBottom: keyboardInset }");
  });

  it('never uses the "height" keyboard behaviour on Android anywhere', () => {
    const all = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? all(join(dir, e.name)) : e.name.endsWith(".tsx") && !e.name.includes(".test.") ? [join(dir, e.name)] : [],
      );
    const offenders = all(join(__dirname, "../..")).filter((file) =>
      /Platform\.OS === "android"\s*\?\s*"height"/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
