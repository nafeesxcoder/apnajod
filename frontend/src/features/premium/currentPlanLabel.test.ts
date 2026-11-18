import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const screen = readFileSync(join(__dirname, "screens", "PremiumScreen.tsx"), "utf8").replace(/\r\n/g, "\n");

it("the plan name and the Current plan badge follow what the member has, not the tapped card", () => {
  expect(screen).toContain('const currentPlanName = summary?.pro ? "Pro" : summary?.premium ? "Plus" : "Premium";');
  expect(screen).toContain('(summary.pro ? plan.code === "pro_monthly" : plan.code === "plus_monthly")');
});
