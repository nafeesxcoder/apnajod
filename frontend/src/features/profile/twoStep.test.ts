import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const screen = readFileSync(join(__dirname, "screens", "TwoStepScreen.tsx"), "utf8");
const settings = readFileSync(join(__dirname, "screens", "SettingsScreen.tsx"), "utf8");
const api = readFileSync(join(__dirname, "..", "..", "api", "authApi.ts"), "utf8");
const app = readFileSync(join(__dirname, "..", "..", "app", "MilaanApp.tsx"), "utf8");

describe("two-step verification", () => {
  it("Settings opens the two-step screen from Privacy & Safety", () => {
    expect(settings).toContain('navigate("two-step")');
    expect(app).toContain('{screen === "two-step" && accessToken && (');
  });

  it("the API calls match the server routes", () => {
    expect(api).toContain('"/auth/login/2fa"');
    expect(api).toContain('"/auth/login/2fa/resend"');
    expect(api).toContain('"/auth/2fa/start"');
    expect(api).toContain('"/auth/2fa/confirm"');
  });

  it("a password sign-in that needs a code shows the code step, not the app", () => {
    expect(app).toContain('if ("twoFactorRequired" in result) {');
    expect(app).toContain("authApi.loginTwoFactor(twoFactorToken, code)");
  });

  it("turning it on or off needs a code from the mobile", () => {
    expect(screen).toContain("authApi.twoFactorConfirm(accessToken, code, turnOn)");
    expect(screen).toContain("authApi.twoFactorStart(accessToken)");
  });
});
