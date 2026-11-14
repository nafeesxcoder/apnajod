import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");

describe("intent lives on the Profile and in Settings, not on Home", () => {
  it("Home shows neither the intent card nor Review preferences", () => {
    const home = read("screens/HomeScreen.tsx");
    expect(home).not.toContain("IntentPassportCard");
    expect(home).not.toContain('label="Review preferences"');
  });

  it("Settings opens the intent questions, and saving returns to Settings", () => {
    expect(read("../profile/screens/SettingsScreen.tsx")).toContain('label="Intent & Future Plans"');
    expect(read("../../app/MilaanApp.tsx")).toContain(".then(() => setScreen(alignmentReturnRef.current))");
    expect(read("../../app/MilaanApp.tsx")).toContain('finishLabel={onboardingComplete ? "Save" : undefined}');
  });
});
