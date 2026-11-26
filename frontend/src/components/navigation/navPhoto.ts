/**
 * The member's own profile photo, for the bottom menu's Profile tab.
 *
 * The app keeps the photos in one place; the menu is drawn by many screens.
 * This small shared value lets every menu show the same photo without each
 * screen being handed it.
 */
import { useSyncExternalStore } from "react";

let current: string | null = null;
const listeners = new Set<() => void>();

export function setNavPhoto(uri: string | null | undefined) {
  const next = uri || null;
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNavPhoto(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}
