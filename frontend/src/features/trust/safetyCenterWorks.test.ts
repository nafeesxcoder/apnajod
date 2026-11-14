import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(__dirname, "..", "..", "..", p), "utf8");
const safety = read("src/features/trust/screens/SafetyScreens.tsx");

describe("Safety Center", () => {
  it("has a real Hide activity status switch, and no switches that change nothing", () => {
    expect(safety).toContain('title="Hide activity status"');
    expect(safety).toContain("safetyApi.setHideActivity(accessToken,next)");
    expect(safety).not.toContain("Secure privacy settings connection required");
    expect(safety).not.toContain("Limit approximate location");
    expect(safety).not.toContain("Private profile-view alerts");
  });

  it("lists blocked accounts with Unblock and shows the server's numbers", () => {
    expect(safety).toContain("safetyApi.blocked(accessToken)");
    expect(safety).toContain("accessibilityLabel={`Unblock ${person.username}`}");
    expect(safety).toContain("summary?.blocked??blockedCount");
  });

  it("downloads your data as a file", () => {
    expect(safety).toContain("link.download='apnajoda-my-data.json'");
    expect(safety).not.toContain("Secure data export is unavailable");
  });

  it("calls 112, India's emergency number", () => {
    expect(safety).toContain("tel:112");
    expect(safety).not.toContain("tel:911");
  });

  it("opens the phone's email app from Help & Support (no window.open in the app)", () => {
    const support = read("src/features/help/screens/SupportScreen.tsx");
    expect(support).toContain('Platform.OS === "web" && typeof window !== "undefined" && typeof window.open === "function"');
    expect(support).toContain("Linking.openURL(`mailto:${to}?subject=${subject}&body=${body}`)");
  });
});
