import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const screen = readFileSync(join(__dirname, "screens", "FindPeopleScreen.tsx"), "utf8").replace(/\r\n/g, "\n");
const api = readFileSync(join(__dirname, "..", "..", "api", "profileApi.ts"), "utf8");
const app = readFileSync(join(__dirname, "..", "..", "app", "MilaanApp.tsx"), "utf8");

describe("Find people filter chips", () => {
  it("asks the server for active or new members", () => {
    expect(api).toContain("&filter=${filter}");
    expect(app).toContain("profileApi.discoverMatches(accessToken, 50, filter)");
    expect(screen).toContain("load(filter)");
  });

  it("shows the filtered list for Active now and New, the deck for All", () => {
    expect(screen).toContain('const shownUsers = filter === "all" ? discoverUsers : filtered;');
    expect(screen).toContain("shownUsers.map((user, index) => (");
  });

  it("has an empty message for each chip", () => {
    expect(screen).toContain("Nobody is online right now");
    expect(screen).toContain("No new members in the last 7 days");
  });
});
