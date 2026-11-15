import { API_URL } from "./config";
import type { LyricLine } from "../features/stories/music/lyrics";

/** A song in the story music library. */
export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  url: string;
  durationSec: number;
  /** The cover picture, if the admin added one. */
  coverUrl?: string | null;
  /** The words with times, if the admin added them. */
  lyrics?: LyricLine[];
};

/** The part of a song a story plays: 5 to 30 seconds. */
export type StoryMusic = {
  trackId: string;
  title: string;
  artist: string;
  url: string;
  start: number;
  length: number;
  coverUrl?: string | null;
  /** The words: the whole song while editing, only the clip's lines on a posted story. */
  lyrics?: LyricLine[];
};

export const MAX_CLIP = 30;
export const MIN_CLIP = 5;

export const musicApi = {
  async search(accessToken: string, words: string): Promise<MusicTrack[]> {
    const response = await fetch(`${API_URL}/music?q=${encodeURIComponent(words.trim())}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not load music.");
    return (data.tracks as MusicTrack[]) || [];
  },
};

/** "1:05" */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
