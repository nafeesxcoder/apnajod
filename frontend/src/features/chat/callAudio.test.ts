import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("../../api/callApi", () => ({ callApi: {} }));

const modal = readFileSync(join(__dirname, "CallModalReal.tsx"), "utf8").replace(/\r\n/g, "\n");

describe("call audio", () => {
  it("starts a voice call in phone mode and a video call on speaker", () => {
    expect(modal).toContain('useState(mode === "video")');
    expect(modal).toContain('setSpeakerOn(mode === "video")');
    expect(modal).toContain('if (kind === "video") setSpeakerOn(true)');
  });

  it("keeps phone mode clearly audible instead of nearly silent", () => {
    expect(modal).toContain("export const PHONE_VOLUME = 0.45;");
    expect(modal).toContain("speakerOn || bluetoothRouted ? 1 : PHONE_VOLUME");
    expect(modal).not.toContain(": 0.06");
  });

  it("labels the speaker button and offers the earphone tip", () => {
    expect(modal).toContain("Phone mode. Switch to speaker");
    expect(modal).toContain("Earphones stop it completely.");
  });

  it("turns echo cancellation back on when the browser left it off", async () => {
    const { ensureEchoCancellation } = await import("./useCallEngine");
    const applyConstraints = vi.fn().mockResolvedValue(undefined);
    const off = { getSettings: () => ({ echoCancellation: false }), applyConstraints };
    const on = { getSettings: () => ({ echoCancellation: true }), applyConstraints: vi.fn() };
    await ensureEchoCancellation({ getAudioTracks: () => [off, on] } as unknown as MediaStream);
    expect(applyConstraints).toHaveBeenCalledWith({ echoCancellation: true, noiseSuppression: true });
    expect(on.applyConstraints).not.toHaveBeenCalled();
  });
});
