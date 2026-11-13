import { API_URL } from "./config";

/** A song in the story music library. */
export type MusicTrack = { id: string; title: string; artist: string; url: string; durationSec: number };

/** The part of a song a story plays: 5 to 30 seconds. */
export type StoryMusic = { trackId: string; title: string; artist: string; url: string; start: number; length: number };

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
