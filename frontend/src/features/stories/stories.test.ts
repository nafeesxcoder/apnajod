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
const editor = read("editor/StoryEditor.tsx");
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
    expect(tray).toContain("allowsEditing: false, quality: 1 }");
    expect(api).toContain('body.append("photo", file, "story.jpg");');
    expect(api).toContain("`${API_URL}/stories`");
  });

  it("keeps the rings' watched marks on the phone, and tells the owner who saw it", () => {
    // Grey rings come from this phone's own list.
    expect(seen).toContain("AsyncStorage.setItem(KEY");
    // "Seen by": one view per story, sent once, only for someone else's story.
    expect(api).toContain("/stories/${storyId}/view");
    expect(viewer).toContain("if (person && !person.mine && !viewSent.has(story.id)) {");
    expect(read("StoryResponses.tsx")).toContain("👁 Seen by · {data.views.length}");
  });

  it("labels your own story with who saw and liked it", async () => {
    const { storyActivityLabel } = await import("./storyLabels");
    expect(storyActivityLabel(0, 0)).toBe("Responses");
    expect(storyActivityLabel(12, 0)).toBe("Seen by 12");
    expect(storyActivityLabel(12, 3)).toBe("Seen by 12 · ❤ 3");
  });

  it("opens the person's stories from a story notification", () => {
    const app = readFileSync(join(__dirname, "..", "..", "app", "MilaanApp.tsx"), "utf8");
    expect(app).toContain("onOpenStory: (userId) => setPendingStoryUser(userId),");
    expect(app).toContain("void loadStories(accessToken).then(() => openStoriesOf(userId));");
    const worker = readFileSync(join(__dirname, "..", "..", "..", "public", "sw.js"), "utf8");
    expect(worker).toContain('client.postMessage({ type: "open-story", storyUserId })');
  });

  it("plays each photo for 5 seconds with tap and hold controls", () => {
    expect(read("music/clip.ts")).toContain("export const STORY_SECONDS = 5;");
    expect(viewer).toContain('accessibilityLabel="Previous story"');
    expect(viewer).toContain('accessibilityLabel="Next story"');
    expect(viewer).toContain("onLongPress={() => setHeld(true)}");
  });

  it("lets you delete your own story and report someone else's", () => {
    expect(viewer).toContain("storyApi.remove(accessToken, story.id)");
    expect(viewer).toContain("`Story ${storyId}: ${mediaUrl}`");
  });

  it("says the story goes after 24 hours and sits at the top of Home", () => {
    expect(editor).toContain("disappears after 24 hours");
    expect(home).toContain("<StoriesTray");
  });
});

describe("taking a story photo on a laptop", () => {
  const camera = read("WebCamera.tsx");
  it("opens the webcam there, and leaves phones to their camera app", () => {
    expect(camera).toContain('window.matchMedia("(pointer: coarse)").matches');
    expect(tray).toContain('if (from === "camera" && needsWebCamera()) {');
  });
  it("lets go of the camera when it closes or the photo is taken", () => {
    expect(camera).toContain("stream.current?.getTracks().forEach((track) => track.stop());");
  });
});
