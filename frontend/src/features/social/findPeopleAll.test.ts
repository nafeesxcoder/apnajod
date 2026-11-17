import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => readFileSync(join(__dirname, ...parts), "utf8");
const picks = read("..", "discovery", "components", "DailyPicksRow.tsx");
const findPeople = read("screens", "FindPeopleScreen.tsx");
const app = read("..", "..", "app", "MilaanApp.tsx");

describe("Home shows today's 5, Find People shows everyone", () => {
  it("Home's row is titled in English and says it refreshes daily", () => {
    expect(picks).toContain("Today's picks for you");
    expect(picks).toContain("5 new people every day");
    expect(picks).not.toContain("Aaj ke 5");
  });

  it("Find People lists every member it was given, not just four", () => {
    expect(findPeople).toContain("{shownUsers.map((user, index) => (");
    expect(findPeople).not.toContain("shownUsers.slice(0, 4)");
  });

  it("the member list is loaded with the server's full page (50)", () => {
    expect(app).toContain("profileApi.discoverMatches(\n                currentToken,\n                50,");
  });
});
