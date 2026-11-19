import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const screen = readFileSync(join(__dirname, "screens", "AdminDashboardScreen.tsx"), "utf8").replace(/\r\n/g, "\n");
const api = readFileSync(join(__dirname, "..", "..", "api", "adminApi.ts"), "utf8");

describe("Admin coins", () => {
  it("each member card has a Coins button and a panel to give or take back", () => {
    expect(screen).toContain('label={coinsOpenId === userId ? "Close" : "Coins"}');
    expect(screen).toContain('label="Give coins"');
    expect(screen).toContain('label="Take back"');
    expect(screen).toContain("<CoinsPanel accessToken={accessToken} userId={userId} />");
  });

  it("talks to the coins endpoints", () => {
    expect(api).toContain("/admin/users/${id}/coins");
  });
});
