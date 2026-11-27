import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const home = readFileSync(join(__dirname, "screens", "HomeScreen.tsx"), "utf8").replace(/\r\n/g, "\n");

describe("Home shows picks, invite and posts only", () => {
  it("has no members grid and no top swipe card", () => {
    expect(home).not.toContain("More introductions");
    expect(home).not.toContain("featured.name");
    expect(home).not.toContain("others.map(");
    expect(home).not.toContain("summaryTitle");
    expect(home).not.toContain("Your next introduction is being curated");
  });

  it("keeps today's picks and the posts feed; the invite card lives under Share profile", () => {
    expect(home).toContain("<DailyPicksRow");
    expect(home).not.toContain("<InviteCard");
    expect(home).toContain("<PostsFeed");
  });
});
