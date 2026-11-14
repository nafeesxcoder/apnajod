/**
 * Opening the Gun Milan sheet from anywhere (a card's badge, a profile):
 * the host in the app shell shows it.
 */
type Target = { userId: string; name: string };

let target: Target | null = null;
const listeners = new Set<(t: Target | null) => void>();

export function openKundli(userId: string, name: string) {
  target = { userId, name };
  listeners.forEach((listener) => listener(target));
}

export function closeKundli() {
  target = null;
  listeners.forEach((listener) => listener(null));
}

export function onKundli(listener: (t: Target | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Opening my own Kundli editor (from the sheet, when I have not added mine). */
const editListeners = new Set<() => void>();
export function openKundliEditor() {
  editListeners.forEach((listener) => listener());
}
export function onKundliEditor(listener: () => void) {
  editListeners.add(listener);
  return () => {
    editListeners.delete(listener);
  };
}

/** My Kundli was saved: whatever shows it reloads. */
const savedListeners = new Set<() => void>();
export function kundliSaved() {
  savedListeners.forEach((listener) => listener());
}
export function onKundliSaved(listener: () => void) {
  savedListeners.add(listener);
  return () => {
    savedListeners.delete(listener);
  };
}
