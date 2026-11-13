import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { postIdFromText } from "./profileLink";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const sheets = read("PostSheets.tsx");
const chat = read("../chat/ChatFeature.tsx");
const app = read("../../app/MilaanApp.tsx");

describe("sheets on a phone", () => {
  it("fit the part of the screen you can see, above the browser toolbar", () => {
    expect(sheets).toContain("window.visualViewport");
    expect(sheets).toContain('style={{ height, justifyContent: centred ? "center" : "flex-end", padding: centred ? 24 : 0 }}');
    expect(sheets).toContain("env(safe-area-inset-bottom, 0px)");
  });

  it("open as a card in the middle on a laptop, not pinned to the bottom", () => {
    expect(sheets).toContain("const centred = width >= 700;");
    expect(sheets).toContain("maxWidth: centred ? 480 : 640,");
  });

  it("scroll instead of cutting off their last rows", () => {
    expect(sheets).toContain('<ScrollView style={{ flexGrow: 0, flexShrink: 1 }}');
  });
});

describe("sending a post in chat", () => {
  it("lists new matches too, not only people you already chatted with", () => {
    expect(sheets).toContain("loadChatsAndMatches(accessToken)");
    expect(app).toContain('import { loadChatsAndMatches } from "../features/social/chatTargets";');
  });

  it("says why when a send fails", () => {
    expect(sheets).toContain("Could not send to ${chat.user.username || chat.user.name}. Please try again.");
  });

  it("shows the post itself in the chat, not a bare link", () => {
    expect(chat).toContain("<SharedPostBubble postId={sharedPostId} mine={mine} />");
    expect(chat).toContain("!emojiOnly && !sharedPostId && (");
  });

  it("finds the post in a shared message", () => {
    const id = "1b297905-bce9-4f0b-8a94-5e941f4f0982";
    expect(postIdFromText(`@anaya: Sunday\nhttps://apnajoda.com/?post=${id}`)).toBe(id);
    expect(postIdFromText("see apnajoda.com/?post=" + id.toUpperCase())).toBe(id);
    expect(postIdFromText("https://example.com/?post=" + id)).toBeNull();
    expect(postIdFromText("hello")).toBeNull();
  });
});

describe("the Send button in Share", () => {
  it("is not inside a disabled button that swallows its taps", () => {
    const row = sheets.slice(sheets.indexOf("function PersonRow("), sheets.indexOf("/** Who liked a post. */"));
    expect(row).not.toContain("disabled={!onPress}");
    expect(row).toContain("<View style={row}>");
  });
});
