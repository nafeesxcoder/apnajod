import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countLabel, shareText, timeAgo } from "./postFormat";
import { userIdFromToken } from "./profileLink";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const card = read("PostCard.tsx");
const sheets = read("PostSheets.tsx");
const section = read("../profile/components/PostsSection.tsx");
const app = read("../../app/MilaanApp.tsx");

describe("words under a post", () => {
  const now = new Date("2026-11-13T12:00:00Z").getTime();
  it("says how long ago, Instagram-style", () => {
    expect(timeAgo(now - 20_000, now)).toBe("now");
    expect(timeAgo(now - 5 * 60_000, now)).toBe("5m");
    expect(timeAgo(now - 3 * 3600_000, now)).toBe("3h");
    expect(timeAgo(now - 2 * 86400_000, now)).toBe("2d");
    expect(timeAgo(now - 15 * 86400_000, now)).toBe("2w");
    expect(timeAgo("2026-08-02T10:00:00Z", now)).toBe("2 Aug");
    expect(timeAgo("2025-08-02T10:00:00Z", now)).toBe("2 Aug 2025");
  });

  it("counts likes and comments", () => {
    expect(countLabel(1, "like", "likes")).toBe("1 like");
    expect(countLabel(23, "like", "likes")).toBe("23 likes");
    expect(countLabel(1234, "like", "likes")).toBe("1.2K likes");
    expect(countLabel(25000, "like", "likes")).toBe("25K likes");
  });

  it("shares the caption and the link", () => {
    expect(shareText("anaya", "Sunday", "https://apnajoda.com/?post=x")).toBe("@anaya: Sunday\nhttps://apnajoda.com/?post=x");
    expect(shareText("anaya", "", "L")).toBe("A post by @anaya on Apnajoda\nL");
  });
});

describe("a post's actions", () => {
  it("has like, comment, share and save, plus double-tap to like", () => {
    for (const label of ['"Comment"', '"Share"', '"Save"', '"Like"']) expect(card).toContain(label);
    expect(card).toContain("now - lastTap.current < 300");
    expect(card).toContain("void setLiked(true);");
  });

  it("undoes a like or save the server refused", () => {
    expect(card).toMatch(/catch \{\n\s+update\(before\);/);
  });

  it("lets the writer or the post's owner delete a comment", () => {
    expect(sheets).toContain("item.canDelete &&");
  });

  it("can send a post to a match in chat, copy the link, or WhatsApp it", () => {
    expect(sheets).toContain("chatApi\n      .sendMessage(");
    expect(sheets).toContain('label="Copy link"');
    expect(sheets).toContain("https://wa.me/?text=");
  });

  it("reports a post into the normal review queue", () => {
    expect(sheets).toContain("safetyApi.report(");
  });

  it("is what the post viewer shows", () => {
    expect(section).toContain("<PostCard");
    expect(section).toContain('"Saved posts, only you can see these"');
  });
});

describe("names on posts open profiles", () => {
  it("are wired once in the app, above the fonts gate", () => {
    const gate = app.indexOf("if (!fontsLoaded)");
    expect(app.indexOf("setProfileOpener((userId) => openProfileRef.current(userId))")).toBeLessThan(gate);
    expect(app.indexOf("useState<string | null>(() => readPostParam())")).toBeLessThan(gate);
    expect(app).toContain('if (userId === userIdFromToken(accessToken)) setScreen("profile");');
  });

  it("reads your own id from the access token", () => {
    const payload = btoa(JSON.stringify({ sub: "00000000-0000-0000-0000-00000000aaaa" })).replace(/=+$/, "");
    expect(userIdFromToken(`h.${payload}.s`)).toBe("00000000-0000-0000-0000-00000000aaaa");
    expect(userIdFromToken("nonsense")).toBeNull();
    expect(userIdFromToken(undefined)).toBeNull();
  });
});
