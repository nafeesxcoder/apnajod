import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const bar = read("StoryReplyBar.tsx");
const viewer = read("StoryViewer.tsx");
const chat = read("../chat/ChatFeature.tsx");

describe("replying to a story", () => {
  it("sends a normal chat message with only a story-reply label", () => {
    expect(bar).toContain("chatApi\n      .sendMessage(accessToken, ownerId, {");
    expect(bar).toContain("storyReply: { reaction },");
    expect(bar).not.toContain("mediaUrl");
  });

  it("offers six quick reactions and a heart", () => {
    expect(bar).toContain('export const STORY_REACTIONS = ["❤️", "😂", "😮", "😢", "👏", "🔥"] as const;');
    expect(bar).toContain('onPress={() => void send("❤️", true)}');
  });

  it("only matches get the box; the story waits while you type", () => {
    expect(bar).toContain("Match with @{username} to reply");
    expect(viewer).toContain("canReply={!!person.canReply}");
    expect(viewer).toContain("|| replying;");
  });

  it("labels the message in chat", () => {
    expect(chat).toContain("{!!message.storyReply && <StoryReplyLabel mine={mine} reaction={!!message.storyReply.reaction} plain={isJustEmoji} />}");
    expect(bar).toContain('"Replied to your story"');
  });
});
