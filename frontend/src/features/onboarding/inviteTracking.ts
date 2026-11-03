import { Platform } from "react-native";

const KEY = "milaan.invite";

// Reads ?invite=<who> from the landing URL once and remembers it, so signup
// can credit the member who invited this person.
export function captureInviteFromUrl(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite")?.trim().slice(0, 60);
    if (invite) {
      window.localStorage.setItem(KEY, invite);
      params.delete("invite");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
      );
      return invite;
    }
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function storedInvite(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
