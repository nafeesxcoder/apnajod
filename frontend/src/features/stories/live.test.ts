import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

import { EMPTY_STATE, addItem, isEdited, isLive, liveStickers, type Item } from "./editor/model";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const poll: Item = { id: "p", kind: "poll", question: "Chai ya coffee?", options: ["Chai", "Coffee"], x: 0.5, y: 0.4, scale: 1, rotation: 0 };
const mention: Item = { id: "m", kind: "mention", userId: "u1", username: "riya", x: 0.5, y: 0.7, scale: 1, rotation: 0 };
const emoji: Item = { id: "e", kind: "emoji", value: "🔥", x: 0.5, y: 0.5, scale: 1, rotation: 0 };

describe("poll, question and @mention stickers", () => {
  it("are sent alongside the photo, not drawn into it", () => {
    const state = addItem(addItem(addItem(EMPTY_STATE, poll), mention), emoji);
    expect(liveStickers(state).map((s) => s.kind)).toEqual(["poll", "mention"]);
    expect(isLive(emoji)).toBe(false);
    expect(read("editor/bake.ts")).toContain("if (isLive(item)) continue;");
    expect(read("editor/StoryEditor.tsx")).toContain("await storyApi.create(accessToken, uri, state.music, liveStickers(state), audience);");
  });

  it("make the story a 9:16 photo, so they land where they were put", () => {
    expect(isEdited(addItem(EMPTY_STATE, poll))).toBe(true);
    expect(read("StoryViewer.tsx")).toContain("const fw = Math.min(screenWidth, height * FRAME_ASPECT);");
  });

  it("let viewers vote once, answer, and open a mentioned profile", () => {
    const viewer = read("StoryViewer.tsx");
    expect(viewer).toContain("if (!result || result.myVote !== null) return;");
    expect(viewer).toContain("storyApi\n                                  .vote(accessToken, story.id, sticker.id, choice)");
    expect(viewer).toContain("setTimeout(() => openProfile(sticker.userId), 80);");
    expect(viewer).toContain("|| !!asking || !!responsesFor || replying;");
  });

  it("show the owner who liked, voted and answered, only on their own story", () => {
    const viewer = read("StoryViewer.tsx");
    expect(viewer).toContain("{loaded && person?.mine && (");
    expect(read("StoryResponses.tsx")).toContain("❤️ Likes · {data.likes.length}");
    expect(read("StoryResponses.tsx")).toContain("Only you can see this. It goes with your story after 24 hours.");
  });
});
