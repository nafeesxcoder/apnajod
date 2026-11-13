import { MAX_CLIP, MIN_CLIP } from "../../../api/musicApi";

/** The lengths you can pick: 15 and 30 seconds, or the whole song if it is shorter. */
export function clipLengths(durationSec: number): number[] {
  if (durationSec > 0 && durationSec < 15) return [Math.max(MIN_CLIP, Math.floor(durationSec))];
  if (durationSec > 0 && durationSec < MAX_CLIP) return [15];
  return [15, MAX_CLIP];
}

/** Keeps the clip inside the song. */
export function clampStart(start: number, length: number, durationSec: number): number {
  if (!durationSec) return 0;
  return Math.max(0, Math.min(Math.floor(start), Math.max(0, Math.floor(durationSec - length))));
}

/** How long a photo story stays on screen. */
export const STORY_SECONDS = 5;

/** A story with a song plays for the song's clip (at most 30 seconds); a photo alone, 5. */
export function storySeconds(story: { music?: { length: number } | null } | undefined): number {
  const length = story?.music?.length;
  return length ? Math.min(MAX_CLIP, Math.max(MIN_CLIP, length)) : STORY_SECONDS;
}
