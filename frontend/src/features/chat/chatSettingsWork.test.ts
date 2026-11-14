import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { archivedCount, listOrder } from "../social/chatListOrder";

const read = (p: string) => readFileSync(join(__dirname, "..", "..", "..", p), "utf8");
const chat = read("src/features/chat/ChatFeature.tsx");
const conv = (id: string, lastAt: number, extra: object = {}) =>
  ({ conversationId: id, user: { userId: id, username: id, name: id, avatarUrl: null, isPrivate: false }, lastMessage: null, lastAt, unread: 0, ...extra }) as any;

describe("chat settings that work", () => {
  it("puts pinned chats first and archived ones in their folder", () => {
    const items = [conv("a", 3), conv("b", 1, { pinned: true }), conv("c", 2, { archived: true })];
    expect(listOrder(items, false).map((c) => c.conversationId)).toEqual(["b", "a"]);
    expect(listOrder(items, true).map((c) => c.conversationId)).toEqual(["c"]);
    expect(archivedCount(items)).toBe(1);
    expect(chat).toContain('...(key === "conversationArchived" ? { archivedAt: next ? Date.now() : undefined } : {}),');
  });

  it("colours your bubbles, the send button and the background with the chat theme", () => {
    expect(chat).toContain("? { backgroundColor: accent || palette.navy, borderBottomRightRadius: 4 }");
    expect(chat).toContain("backgroundColor: activeTheme.accent,");
    expect(chat).toContain("style={{ backgroundColor: activeTheme.wash }}");
  });

  it("has sound on or silent instead of ringtones a phone cannot play per chat", () => {
    expect(chat).toContain('accessibilityLabel={`Notification sound: ${label}`}');
    expect(chat).not.toContain('["Apnajoda Chime", "Soft Rose", "Classic", "Silent"]');
    expect(read("public/sw.js")).toContain("silent: !!data.silent,");
  });

  it("reports screenshots in the phone app, and hides the setting on the web", () => {
    expect(read("src/features/chat/screenshotWatch.ts")).toContain("export const screenshotDetection = false;");
    expect(read("src/features/chat/screenshotWatch.native.ts")).toContain("ScreenCapture.addScreenshotListener(onScreenshot)");
    expect(chat).toContain("void chatApi.screenshot(accessToken, conversationId)");
    expect(chat).toContain("{screenshotDetection && (");
  });

  it("no longer lists sample profiles as your conversations", () => {
    expect(chat).not.toContain("function ConversationInboxSheet(");
    expect(chat).not.toContain('label: "Conversation inbox"');
  });
});
