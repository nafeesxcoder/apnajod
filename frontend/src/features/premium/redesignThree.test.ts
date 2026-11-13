import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(__dirname, "..", "..", path), "utf8").replace(/\r\n/g, "\n");
const premium = read("features/premium/screens/PremiumScreen.tsx");
const settings = read("features/profile/screens/SettingsScreen.tsx");
const support = read("features/help/screens/SupportScreen.tsx");

describe("Premium, Settings and Help in Navy x Crimson", () => {
  it("each has one navy hero card", () => {
    for (const screen of [premium, settings, support]) expect(screen).toContain("colors={brand.heroGradient}");
  });

  it("use white cards and the shared motion", () => {
    for (const screen of [premium, settings, support]) {
      expect(screen).toContain("...whiteCard");
      expect(screen).toContain("<Reveal");
      expect(screen).toContain("<PressScale");
    }
  });

  it("have a 44px back button and no clay (old) colour", () => {
    for (const screen of [premium, settings, support]) {
      expect(screen).toMatch(/width: 44,\s+height: 44,/);
      expect(screen).not.toContain("palette.clay");
    }
  });

  it("Premium: crimson Buy with a glow, emoji replaced by icons", () => {
    expect(premium).toContain("backgroundColor: palette.crimson,\n                      paddingVertical: 16,");
    expect(premium).toContain("<GlowPulse color={palette.crimson} radius={radius.pill} spread={1.08} />");
    expect(premium).not.toMatch(/🚀|⭐/);
  });

  it("Settings: rows are made outside the screen, so switches do not remount", () => {
    expect(settings).toMatch(/^function SettingsRow\(/m);
    expect(settings).not.toContain("const Row = (");
  });
});
