import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const findPeople = readFileSync(join(__dirname, "screens", "FindPeopleScreen.tsx"), "utf8").replace(/\r\n/g, "\n");

describe("Find People shows a few members, then More reveals the rest", () => {
  it("starts with 12 members", () => {
    expect(findPeople).toContain("const INITIAL_SHOWN = 12;");
    expect(findPeople).toContain("const visibleUsers = shownUsers.slice(0, visibleCount);");
  });

  it("has a More button that shows every member it has", () => {
    expect(findPeople).toContain("{shownUsers.length > visibleCount && (");
    expect(findPeople).toContain("onPress={() => setVisibleCount(shownUsers.length)}");
  });

  it("goes back to the first 12 when the filter changes", () => {
    expect(findPeople).toContain("setVisibleCount(INITIAL_SHOWN);\n  }, [filter]);");
  });
});
