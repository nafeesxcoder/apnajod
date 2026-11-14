import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

import { clampStart, clipLengths, nudgeStart, storySeconds } from "./clip";
import { EMPTY_STATE, musicLabel, removeItem, setMusic } from "../editor/model";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const song = { trackId: "t1", title: "Monsoon Evening", artist: "Lofi Desi", url: "https://x/a.mp3", start: 12, length: 15 };

describe("story music", () => {
  it("offers 5 to 30 seconds - never more than the song or 30", () => {
    expect(clipLengths(180)).toEqual([5, 10, 15, 20, 30]);
    expect(clipLengths(20)).toEqual([5, 10, 15, 20]);
    expect(clipLengths(3)).toEqual([3]);
    // Length unknown: every choice, the part is chosen once it is read.
    expect(clipLengths(0)).toEqual([5, 10, 15, 20, 30]);
    expect(Math.max(...clipLengths(600))).toBe(30);
  });

  it("moves the part 5 seconds at a time, inside the song", () => {
    expect(nudgeStart(100, 5, 15, 300)).toBe(105);
    expect(nudgeStart(2, -5, 15, 300)).toBe(0);
    expect(nudgeStart(283, 5, 15, 300)).toBe(285);
  });

  it("reads the song's length when the library has none, and the admin can fix it", () => {
    const sheet = read("MusicSheet.tsx");
    expect(sheet).toContain("void audioDuration(chosen.url).then((seconds) => {");
    expect(sheet).toContain('accessibilityLabel={by < 0 ? "5 seconds earlier" : "5 seconds later"}');
    const admin = readFileSync(join(__dirname, "..", "..", "admin", "screens", "MusicTab.tsx"), "utf8");
    expect(admin).toContain('button("Fix length", () => void fixLength(track), "plain", busyId === track.id)');
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
