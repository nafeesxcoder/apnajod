/**
 * The festival theme that is on now, shared by every screen.
 *
 * Asked for when the app opens, every 10 minutes and when the app comes
 * back to the front; the server also pushes "app:theme" over the socket the
 * moment the admin applies or turns one off.
 */
import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { API_URL } from "../../api/config";
import { type ActiveFestival, festivalFor } from "./themes";
import { setPromo } from "../promo/promoStore";

let current: ActiveFestival | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setFestival(next: ActiveFestival | null) {
  const same =
    (current?.id ?? null) === (next?.id ?? null) &&
    (current?.greeting ?? null) === (next?.greeting ?? null) &&
    (current?.endsAt ?? null) === (next?.endsAt ?? null);
  current = next;
  if (!same) emit();
}

export function currentFestival() {
  return festivalFor(current);
}

export async function refreshFestival() {
  try {
    const res = await fetch(`${API_URL}/app/theme`);
    if (!res.ok) return;
    const data = await res.json();
    setFestival(data?.theme ?? null);
    // The offer popup rides along with the theme.
    setPromo(data?.promo ?? null);
  } catch {
    // Offline: keep what we had.
  }
}

let started = false;
/** Start asking. Safe to call more than once. */
export function startFestivalWatch() {
  if (started) return;
  started = true;
  void refreshFestival();
  setInterval(() => void refreshFestival(), 10 * 60 * 1000);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void refreshFestival();
    });
  } else {
    AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshFestival();
    });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The theme on now (with the admin's greeting), or null. */
export function useFestival() {
  const active = useSyncExternalStore(subscribe, () => current, () => current);
  return festivalFor(active);
}
