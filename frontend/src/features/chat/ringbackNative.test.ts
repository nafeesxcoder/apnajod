import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("the caller's ringing tone in the phone app", () => {
  const native = readFileSync(join(__dirname, "ringback.native.ts"), "utf8");

  it("plays the phone's own ringback tone instead of silence", () => {
    // The web tone uses the Web Audio API, which the phone app does not have.
    expect(native).toContain('InCallManager.startRingback("_DTMF_")');
    expect(native).toContain("InCallManager.stopRingback()");
    expect(native).toMatch(/export function startRingback\(\): Ringback/);
  });
});

describe("invite links from the phone app", () => {
  it("point at apnajoda.com", () => {
    const helpers = readFileSync(join(__dirname, "../onboarding/inviteHelpers.ts"), "utf8");
    expect(helpers).toContain('"https://apnajoda.com"');
    expect(helpers).not.toContain("milaan.in");
  });
});
