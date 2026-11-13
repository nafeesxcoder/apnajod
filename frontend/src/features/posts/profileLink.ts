/**
 * "Open this person's profile" from anywhere a name or photo is shown on a
 * post (the post's header, a comment, the likes list) - without threading a
 * callback through every screen. The app registers how to open a profile
 * once; post components just call openProfile(userId).
 */
type Opener = (userId: string) => void;

let opener: Opener | null = null;

export function setProfileOpener(next: Opener | null) {
  opener = next;
}

export function canOpenProfile(): boolean {
  return !!opener;
}

export function openProfile(userId: string) {
  opener?.(userId);
}

/** Your own user id, read from the access token (no request needed). */
export function userIdFromToken(accessToken?: string | null): string | null {
  if (!accessToken) return null;
  const part = accessToken.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json =
      typeof atob === "function"
        ? atob(base64)
        : (globalThis as { Buffer?: { from: (s: string, e: string) => { toString: (e: string) => string } } }).Buffer?.from(base64, "base64").toString("utf8") ?? "";
    const payload = JSON.parse(json);
    const id = payload.sub || payload.id || payload.userId;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}
