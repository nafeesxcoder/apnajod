import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { pushTarget } from "./nativePush";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const native = read("nativePush.native.ts");
const app = read("../MilaanApp.tsx");
const config = read("../../../app.config.ts");
const appJson = JSON.parse(read("../../../app.json")).expo;

describe("notifications in the phone app", () => {
  it("opens the chat or post a tapped notification is about", () => {
    expect(pushTarget({ conversationId: "u1", postId: "p1" })).toEqual({ chat: "u1" });
    expect(pushTarget({ postId: "p1" })).toEqual({ post: "p1" });
    expect(pushTarget(null)).toEqual({});
    expect(native).toContain("Notifications.getLastNotificationResponseAsync()");
  });

  it("asks for permission, then sends the phone's Expo token to the server", () => {
    expect(native).toContain("await Notifications.requestPermissionsAsync()");
    expect(native).toContain("await pushApi.saveDeviceToken(accessToken, token, Platform.OS);");
  });

  it("starts with the session and lets go of the phone on sign-out", () => {
    expect(app).toContain("return startNativePush(accessToken, {");
    expect(app).toContain("if (accessToken) await forgetNativePush(accessToken);");
  });

  it("builds with Firebase from EAS, never from git", () => {
    expect(config).toContain("process.env.GOOGLE_SERVICES_JSON ||");
    expect(read("../../../.gitignore")).toContain("google-services.json");
    expect(JSON.stringify(appJson.plugins)).toContain("expo-notifications");
  });
});

describe("chat", () => {
  it("shows the time under a big emoji in grey (it has no bubble)", () => {
    expect(read("../../features/chat/ChatFeature.tsx")).toContain('mine && !emojiOnly && !isJustEmoji ? "rgba(255,255,255,.82)" : colors.muted');
  });
});

describe("story notifications", () => {
  it("open the stories of the person they are about", () => {
    expect(pushTarget({ storyUserId: "u9" })).toEqual({ story: "u9" });
  });
});
