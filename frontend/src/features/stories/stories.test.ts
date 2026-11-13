import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined) },
}));

import { liveStories } from "./storySeen";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const tray = read("StoriesTray.tsx");
const viewer = read("StoryViewer.tsx");
const composer = read("StoryComposer.tsx");
const seen = read("storySeen.ts");
const api = read("../../api/storyApi.ts");
const home = read("../discovery/screens/HomeScreen.tsx");

describe("stories", () => {
  it("drops a story whose 24 hours are up, even if the tray was left open", () => {
    const now = Date.parse("2026-11-13T12:00:00Z");
    const stories = [
      { id: "old", expiresAt: "2026-11-13T11:59:59Z" },
      { id: "live", expiresAt: "2026-11-13T12:00:01Z" },
    ];
    expect(liveStories(stories, now).map((story) => story.id)).toEqual(["live"]);
  });

  it("uploads the photo as picked: no crop, full quality", () => {
    expect(tray).toContain("allowsEditing: false,");
    expect(tray).toContain("quality: 1,");
    expect(api).toContain('body.append("photo", file, "story.jpg");');
    expect(api).toContain("`${API_URL}/stories`");
  });

  it("keeps who-watched-what on the phone only", () => {
    expect(seen).toContain("AsyncStorage.setItem(KEY");
    expect(api).not.toMatch(/seen|view/i);
  });

  it("plays each photo for 5 seconds with tap and hold controls", () => {
    expect(viewer).toContain("export const STORY_SECONDS = 5;");
    expect(viewer).toContain('accessibilityLabel="Previous story"');
    expect(viewer).toContain('accessibilityLabel="Next story"');
    expect(viewer).toContain("onLongPress={() => setHeld(true)}");
  });

  it("lets you delete your own story and report someone else's", () => {
    expect(viewer).toContain("storyApi.remove(accessToken, story.id)");
    expect(viewer).toContain("`Story ${storyId}: ${mediaUrl}`");
  });

  it("says the story goes after 24 hours and sits at the top of Home", () => {
    expect(composer).toContain("Disappears after 24 hours");
    expect(home).toContain("<StoriesTray");
  });
});
