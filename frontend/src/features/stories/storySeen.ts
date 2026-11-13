import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Which stories you have already watched - kept only on this phone, never
 * sent to the server (the server keeps nothing about stories beyond the
 * photo itself, for 24 hours). Each id is kept until its story expires, so
 * the list never grows past a day's worth.
 */
const KEY = "apnajoda.storySeen";

let seen: Map<string, number> | null = null;

export async function loadSeen(): Promise<Set<string>> {
  if (!seen) {
    seen = new Map();
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      for (const [id, until] of Object.entries(parsed)) seen.set(id, Number(until));
    } catch {
      // Storage unavailable (private window): seen lasts until the app closes.
    }
  }
  const now = Date.now();
  for (const [id, until] of seen) if (!(until > now)) seen.delete(id);
  return new Set(seen.keys());
}

export function markSeen(id: string, expiresAt: string) {
  if (!seen) seen = new Map();
  if (seen.has(id)) return;
  const until = new Date(expiresAt).getTime();
  seen.set(id, Number.isFinite(until) ? until : Date.now() + 24 * 60 * 60 * 1000);
  const now = Date.now();
  const keep: Record<string, number> = {};
  for (const [key, value] of seen) if (value > now) keep[key] = value;
  AsyncStorage.setItem(KEY, JSON.stringify(keep)).catch(() => undefined);
}

/** Stories that have not run out yet - the server hides them too, this just covers a tray left open. */
export function liveStories<T extends { expiresAt: string }>(stories: T[], now = Date.now()): T[] {
  return stories.filter((story) => new Date(story.expiresAt).getTime() > now);
}
