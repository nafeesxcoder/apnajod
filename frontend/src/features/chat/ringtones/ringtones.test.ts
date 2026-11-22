import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { cleanRingtone, DEFAULT_RINGTONE, MAX_CUSTOM_BYTES, RINGTONES, ringtoneName } from "./ringtoneList";

const read = (p: string) => readFileSync(join(__dirname, "..", "..", "..", "..", p), "utf8");

describe("call ringtones", () => {
  it("has twelve of our own, each with a file", () => {
    expect(RINGTONES).toHaveLength(12);
    expect(new Set(RINGTONES.map((r) => r.key)).size).toBe(12);
    for (const r of RINGTONES) expect(existsSync(join(__dirname, "../../../../assets/sounds/ringtones", `${r.key}.mp3`))).toBe(true);
  });

  it("keeps a saved choice sane, and your own only when there is one", () => {
    expect(cleanRingtone("tabla", false)).toBe("tabla");
    expect(cleanRingtone("nope", false)).toBe(DEFAULT_RINGTONE);
    expect(cleanRingtone("custom", false)).toBe(DEFAULT_RINGTONE);
    expect(cleanRingtone("custom", true)).toBe("custom");
    expect(ringtoneName("custom", "my-song.mp3")).toBe("my-song");
    expect(ringtoneName("sitar")).toBe("Sitar Touch");
    expect(MAX_CUSTOM_BYTES).toBe(2 * 1024 * 1024);
  });

  it("rings with your choice on repeat while a call comes in, and stops after", () => {
    const chat = read("src/features/chat/IncomingCallHost.tsx");
    expect(chat).toContain("const ring = ringtone.startRinging();");
    expect(chat).toContain("ring.stop();");
    const player = read("src/features/chat/ringtones/ringtone.ts");
    expect(player).toContain("player.loop = true;");
    expect(player).toContain('if (key === "custom" && custom) return { uri: custom.dataUrl };');
  });

  it("is in Settings, with a play button and your own from the phone", () => {
    // Only the row's name in Settings; the chosen tune shows inside the sheet.
    const settings = read("src/features/profile/screens/SettingsScreen.tsx");
    expect(settings).toContain('label="Call ringtone"');
    expect(settings).not.toContain("ring.name");
    const sheet = read("src/features/chat/ringtones/RingtoneSheet.tsx");
    expect(sheet).toContain('accessibilityLabel="Choose a ringtone from my phone"');
    expect(sheet).toContain("asset.size > MAX_CUSTOM_BYTES");
  });
});
