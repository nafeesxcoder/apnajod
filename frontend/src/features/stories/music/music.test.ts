import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

import { clampStart, clipLengths, nudgeStart, storySeconds } from "./clip";
import { EMPTY_STATE, liveStickers, musicLabel, removeItem, setMusic, setSongLook, songLookLabel } from "../editor/model";
import { clipLines, lineAt, nextMusicLook } from "./lyrics";

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

  it("puts a song on the story with no title until a look is chosen, and takes the song off with its sticker", () => {
    const withSong = setMusic(EMPTY_STATE, song);
    expect(withSong.music).toEqual(song);
    // No title by default: the song plays, and no sticker is drawn.
    expect(withSong.items).toHaveLength(0);
    expect(liveStickers(withSong)).toEqual([]);
    // Choosing a look adds the sticker, which is live (not drawn into the photo).
    const titled = setSongLook(withSong, { style: "card" }, "m1");
    expect(titled.items[0]).toMatchObject({ kind: "music", style: "card" });
    expect(liveStickers(titled).map((item) => item.kind)).toEqual(["music"]);
    const changed = setMusic(titled, { ...song, title: "Other" });
    expect(changed.items).toHaveLength(1);
    expect(removeItem(titled, "m1").music).toBeNull();
    expect(musicLabel({ title: "A".repeat(50), artist: "" })).toHaveLength(36);
  });

  it("can have the song with no title: it plays, and no sticker is shown", () => {
    const withSong = setSongLook(setMusic(EMPTY_STATE, song), { style: "card" }, "m1");
    const quiet = setSongLook(withSong, null, "unused");
    expect(quiet.music).toEqual(song);
    expect(liveStickers(quiet)).toEqual([]);
    expect(songLookLabel(quiet)).toBe("No title");
    // Changing the song keeps "no title"; choosing a look brings the sticker back.
    expect(setMusic(quiet, { ...song, title: "Other" }).items).toHaveLength(0);
    const shown = setSongLook(quiet, { style: "pill" }, "m3");
    expect(shown.items).toEqual([expect.objectContaining({ kind: "music", style: "pill" })]);
    expect(songLookLabel(shown)).toBe("Small");
    expect(songLookLabel(setSongLook(shown, { style: "lyrics", lyricFont: "glow" }, "m4"))).toBe("Lyrics");
  });

  it("shows the song's title on the story only when it has its sticker", () => {
    expect(read("../StoryViewer.tsx")).toContain("{!!story.music && hasMusicSticker && (");
    const editor = read("../editor/StoryEditor.tsx");
    expect(editor).toContain('accessibilityLabel="Song look"');
    expect(editor).toContain("<SongLookSheet");
    const sheet = read("../editor/SongLookSheet.tsx");
    expect(sheet).toContain('label: "No title"');
    expect(sheet).toContain('title="Song look"');
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

// Made-up lines for the tests (the admin adds a song's real words).
const LINES = [
  { at: 1.5, text: "Test line one" },
  { at: 5, text: "Test line two" },
  { at: 9.25, text: "Test line three" },
  { at: 14, text: "" },
  { at: 62.5, text: "Test line four" },
];

describe("song sticker, like Instagram", () => {
  it("keeps the lines of the clip, from the one already playing", () => {
    expect(clipLines(LINES, 6, 10).map((l) => l.at)).toEqual([5, 9.25, 14]);
    expect(clipLines(LINES, 0, 5).map((l) => l.at)).toEqual([1.5]);
    expect(clipLines(undefined, 0, 15)).toEqual([]);
  });

  it("knows which line is playing", () => {
    expect(lineAt(LINES, 0.5)).toBe(-1);
    expect(lineAt(LINES, 1.5)).toBe(0);
    expect(lineAt(LINES, 7)).toBe(1);
    expect(lineAt(LINES, 14.2)).toBe(3);
    expect(lineAt(LINES, 99)).toBe(4);
  });

  it("taps through card, pill and three lyric looks (lyrics only when there are words)", () => {
    let look: { style: "card" | "pill" | "lyrics"; lyricFont?: "classic" | "box" | "glow" } = { style: "card" };
    const seen: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      look = nextMusicLook(look, true);
      seen.push(look.style === "lyrics" ? `lyrics:${look.lyricFont}` : look.style);
    }
    expect(seen).toEqual(["pill", "lyrics:classic", "lyrics:box", "lyrics:glow", "card"]);
    expect(nextMusicLook({ style: "pill" }, false)).toEqual({ style: "card" });
  });

  it("shows the sticker live on the story and lets the admin add a cover and words", () => {
    const viewer = read("../StoryViewer.tsx");
    expect(viewer).toContain("setSongTime(music.start + done.current * storySeconds(story))");
    expect(viewer).toContain("lyrics: story.music.lyrics");
    expect(read("../editor/StoryEditor.tsx")).toContain("nextMusicLook(tapped, !!stickerMusic?.lyrics.length)");
    const admin = read("../../admin/screens/MusicTab.tsx");
    expect(admin).toContain("adminApi.musicLyrics(accessToken, track.id, lyricsDraft)");
    expect(admin).toContain("adminApi.musicCover(accessToken, track.id, blob, asset.name)");
  });
});
