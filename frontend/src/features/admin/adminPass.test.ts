import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const screen = readFileSync(join(__dirname, "screens", "AdminDashboardScreen.tsx"), "utf8").replace(/\r\n/g, "\n");
const api = readFileSync(join(__dirname, "..", "..", "api", "adminApi.ts"), "utf8");

describe("Admin free pass", () => {
  it("each member card has a Pass button and a panel with Give and Delete", () => {
    expect(screen).toContain('label={passOpenId === userId ? "Close" : "Pass"}');
    expect(screen).toContain('label="Give pass"');
    expect(screen).toContain('label="Delete pass"');
  });

  it("the panel offers Plus, Pro, Everything and 1 month, 3 months, 1 year", () => {
    expect(screen).toContain('{ id: "everything", label: "Everything" }');
    expect(screen).toContain('{ months: 12, label: "1 year" }');
  });

  it("talks to the pass endpoints", () => {
    expect(api).toContain("/admin/users/${id}/pass");
    expect(api).toContain('method: "DELETE"');
  });
});
