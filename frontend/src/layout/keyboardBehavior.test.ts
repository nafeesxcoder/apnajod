import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(__dirname, "..", path), "utf8").replace(/\r\n/g, "\n");

describe("the keyboard on Android", () => {
  it("pushes the screen up there too (edge-to-edge no longer shrinks the window)", () => {
    expect(read("layout/keyboardBehavior.ts")).toContain('Platform.OS === "web" ? undefined : "padding"');
  });

  it("is handled on the log-in screens, sheets, chat and the story editor", () => {
    for (const file of [
      "features/access/screens/AccessScreens.tsx",
      "features/posts/PostSheets.tsx",
      "features/chat/ChatFeature.tsx",
      "features/stories/editor/TextComposer.tsx",
      "features/stories/editor/LiveComposer.tsx",
      "features/stories/StoryReplyBar.tsx",
    ]) {
      const source = read(file);
      expect(source, file).toContain("behavior={keyboardBehavior}");
      expect(source, file).not.toContain('behavior={Platform.OS === "ios" ? "padding" : undefined}');
    }
  });
});

describe("opening the app with an old login", () => {
  it("goes quietly to the welcome screen instead of showing an error card", () => {
    const app = read("app/MilaanApp.tsx");
    expect(app).not.toContain('title: "Session restore failed"');
    expect(app).toContain('title: "Could not reach Apnajoda"');
  });
});
