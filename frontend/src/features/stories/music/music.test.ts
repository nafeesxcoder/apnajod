import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

import { clampStart, clipLengths, storySeconds } from "./clip";
import { EMPTY_STATE, musicLabel, removeItem, setMusic } from "../editor/model";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const song = { trackId: "t1", title: "Monsoon Evening", artist: "Lofi Desi", url: "https://x/a.mp3", start: 12, length: 15 };

describe("story music", () => {
  it("offers 15 or 30 seconds - never more than 30", () => {
    expect(clipLengths(180)).toEqual([15, 30]);
    expect(clipLengths(20)).toEqual([15]);
    expect(clipLengths(9)).toEqual([9]);
    expect(Math.max(...clipLengths(600))).toBe(30);
  });

  it("keeps the chosen part inside the song", () => {
    expect(clampStart(170, 30, 180)).toBe(150);
    expect(clampStart(-4, 15, 180)).toBe(0);
    expect(clampStart(40.7, 15, 180)).toBe(40);
  });

  it("plays a music story for its clip, and a photo story for 5 seconds", () => {
    expect(storySeconds({ music: { length: 30 } })).toBe(30);
    expect(storySeconds({ music: { length: 99 } })).toBe(30);
    expect(storySeconds({ music: null })).toBe(5);
  });

  it("puts a song sticker on the story and takes the song off with it", () => {
    const withSong = setMusic(EMPTY_STATE, song, "m1");
    expect(withSong.music).toEqual(song);
    expect(withSong.items[0]).toMatchObject({ kind: "music", value: "♫ Monsoon Evening · Lofi Desi" });
    const changed = setMusic(withSong, { ...song, title: "Other" }, "m2");
    expect(changed.items).toHaveLength(1);
    expect(removeItem(withSong, "m1").music).toBeNull();
    expect(musicLabel({ title: "A".repeat(50), artist: "" })).toHaveLength(36);
  });

  it("sends only the song, start and length with the story", () => {
    const api = read("../../../api/storyApi.ts");
    expect(api).toContain('body.append("musicTrackId", music.trackId);');
    expect(api).toContain('body.append("musicLength", String(music.length));');
    expect(read("../editor/StoryEditor.tsx")).toContain("await storyApi.create(accessToken, uri, state.music, liveStickers(state), audience);");
  });

  it("lets viewers turn the sound off, and pauses the song with the story", () => {
    const viewer = read("../StoryViewer.tsx");
    expect(viewer).toContain('accessibilityLabel={muted ? "Sound on" : "Sound off"}');
    expect(viewer).toContain("if (paused) clip.current.pause();");
    expect(viewer).toContain("duration: storySeconds(story) * 1000");
  });
});
