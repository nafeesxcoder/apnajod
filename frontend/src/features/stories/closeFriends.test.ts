import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { closeUnseen } from "./storyStore";

const read = (p: string) => readFileSync(join(__dirname, p), "utf8");

describe("close friends stories", () => {
  it("shares to Close friends from the editor, picking the list first if it is empty", () => {
    const editor = read("editor/StoryEditor.tsx");
    expect(editor).toContain('accessibilityLabel="Share to close friends"');
    expect(editor).toContain('if (audience === "close" && closeCount === 0) {');
    expect(editor).toContain("liveStickers(state), audience);");
    expect(read("../../api/storyApi.ts")).toContain('if (audience === "close") body.append("audience", "close");');
  });

  it("shows a green ring for an unwatched Close friends story", () => {
    const person = {
      user: { userId: "u1", username: "a", name: "A", avatarUrl: null },
      mine: false,
      stories: [
        { id: "s1", mediaUrl: "x", createdAt: "", expiresAt: "" },
        { id: "s2", mediaUrl: "y", createdAt: "", expiresAt: "", closeFriends: true },
      ],
    };
    expect(closeUnseen([person], new Set(), "u1")).toBe(true);
    expect(closeUnseen([person], new Set(["s2"]), "u1")).toBe(false);
    expect(closeUnseen([person], new Set(), "nobody")).toBe(false);
    expect(read("StoryRing.tsx")).toContain("backgroundColor: CLOSE_GREEN");
    expect(read("StoryViewer.tsx")).toContain('accessibilityLabel="Close friends story"');
  });

  it("keeps the list in Settings and the sheet", () => {
    expect(read("../profile/screens/SettingsScreen.tsx")).toContain('label="Close Friends"');
    expect(read("CloseFriendsSheet.tsx")).toContain("Nobody is told when you add or remove them.");
  });
});
