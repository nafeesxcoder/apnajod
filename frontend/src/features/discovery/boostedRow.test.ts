import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => readFileSync(join(__dirname, ...parts), "utf8").replace(/\r\n/g, "\n");
const row = read("components", "BoostedRow.tsx");
const home = read("screens", "HomeScreen.tsx");
const matching = read("..", "..", "domain", "matching.ts");

describe("Boosted members row on Home", () => {
  it("is a horizontal row sized like Today's picks", () => {
    expect(row).toContain("horizontal");
    expect(row).toContain("style={{ width: 56, alignItems: \"center\", gap: 4 }}");
    expect(row).toContain("<SpinRing size={54} spin={false}>");
  });

  it("renders nothing when nobody is boosted", () => {
    expect(row).toContain("if (members.length === 0) return null;");
  });

  it("Home feeds it only boosted members and sits above today's picks", () => {
    expect(home).toContain("items.filter((m) => m.boosted).slice(0, 10)");
    expect(home.indexOf("<BoostedRow")).toBeLessThan(home.indexOf("<DailyPicksRow"));
  });

  it("ranking puts a running boost first", () => {
    expect(matching).toContain("b.boosted - a.boosted ||");
  });
});
