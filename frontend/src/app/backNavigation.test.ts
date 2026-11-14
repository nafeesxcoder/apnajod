import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(__dirname, "..", "..", p), "utf8");
const app = read("src/app/MilaanApp.tsx");
const admin = read("src/features/admin/screens/AdminDashboardScreen.tsx");

describe("the back button", () => {
  it("never takes a signed-in member back to the sign-in pages", () => {
    expect(app).toContain("if (target && signedInRef.current && AUTH_SCREENS.has(target)) {");
    expect(app).toContain('const AUTH_SCREENS = new Set<Screen>(["splash", "welcome", "signup", "login", "otp", "forgotPassword", "newPassword", "adminLogin"]);');
  });

  it("works on Android: the screen before, then Home, then the phone's own back", () => {
    expect(app).toContain('BackHandler.addEventListener("hardwareBackPress"');
    expect(app).toContain("if (signedInRef.current && AUTH_SCREENS.has(previous)) continue;");
  });

  it("walks back through the admin tabs and stays in the admin on Overview", () => {
    expect(admin).toContain('window.history.pushState({ milaanScreen: "adminDashboard", adminTab: next, adminFilter: filter }, "");');
    expect(admin).toContain('window.addEventListener("popstate", onPop, true);');
    expect(app).toContain('if (screenRef.current === "adminDashboard") return;');
  });
});

describe("admin: who has what", () => {
  it("filters members by selfie verified, blue tick, Pro, paid and pending", () => {
    for (const key of ['"verified"', '"bluetick"', '"pro"', '"paid"', '"pending"']) expect(admin).toContain(`key: ${key}`);
    expect(admin).toContain('onPress={() => onNavigate("users", "bluetick")}');
    expect(admin).toContain('onPress={() => onNavigate("users", "verified")}');
    expect(admin).toContain("Pro, not verified (no blue tick)");
  });
});
