import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => readFileSync(join(__dirname, ...parts), "utf8");
const findPeople = read("screens", "FindPeopleScreen.tsx");
const picks = read("..", "discovery", "components", "DailyPicksRow.tsx");
const ludo = read("..", "ludo", "LudoScreen.tsx");
const app = read("..", "..", "app", "MilaanApp.tsx");
const hook = read("useOnlineIds.ts");

describe("green dot on the other member lists", () => {
  it("one shared hook asks the server every 30 seconds", () => {
    expect(hook).toContain(".presenceFor(accessToken, key.split(\",\"))");
    expect(hook).toContain("setInterval(check, 30_000)");
  });

  it("Find People, daily picks and the Ludo room show the dot", () => {
    expect(findPeople).toContain("useOnlineIds(accessToken, shownUsers.map((u) => u.userId))");
    expect(findPeople).toContain("online[user.userId] && <OnlineDot");
    expect(picks).toContain("useOnlineIds(accessToken, data?.picks.map((p) => p.id) ?? [])");
    expect(picks).toContain("online[pick.id] && <OnlineDot");
    expect(ludo).toContain("useOnlineIds(accessToken, game?.members.map((m) => m.userId) ?? [])");
    expect(ludo).toContain("online[member.userId] && <OnlineDot");
  });

  it("Find People gets the token from the app", () => {
    expect(app).toContain("<FindPeopleScreen\n            accessToken={accessToken}");
  });
});
