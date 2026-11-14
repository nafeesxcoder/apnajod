import { MAX_CLIP, MIN_CLIP } from "../../../api/musicApi";

/** The lengths you can pick: 5 to 30 seconds, as long as the song allows. */
export const CLIP_LENGTHS = [5, 10, 15, 20, MAX_CLIP] as const;
export function clipLengths(durationSec: number): number[] {
  if (durationSec > 0 && durationSec < MIN_CLIP) return [Math.max(1, Math.floor(durationSec))];
  if (!durationSec) return [...CLIP_LENGTHS];
  return CLIP_LENGTHS.filter((seconds) => seconds <= durationSec);
}

/** Moves the clip by some seconds (the -5s / +5s buttons), kept inside the song. */
export function nudgeStart(start: number, by: number, length: number, durationSec: number): number {
  return clampStart(start + by, length, durationSec);
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
