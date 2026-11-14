/**
 * The offer popup that is on now. It comes with the festival theme from
 * /app/theme and over the socket ("app:promo") the moment the admin
 * publishes or turns it off.
 */
import { useSyncExternalStore } from "react";
import type { Promo } from "./styles";

let current: Promo | null = null;
const listeners = new Set<() => void>();

export function setPromo(next: Promo | null) {
  const changed = JSON.stringify(current) !== JSON.stringify(next);
  current = next;
  if (changed) listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePromo() {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
