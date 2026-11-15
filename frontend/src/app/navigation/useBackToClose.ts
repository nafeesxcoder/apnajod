import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

/**
 * On the web, the phone's back button closes an open popup instead of
 * leaving the screen behind it. Opening a popup adds a history entry;
 * back takes it off again and closes the popup, so the app stays where it
 * was (Home stays Home). The native app already does this through the
 * Modal's onRequestClose.
 *
 * Popups opened on top of each other close one at a time, top first.
 * Closing one some other way (its X, a swipe) takes its entry off too, so
 * the next back does not land on nothing.
 *
 * Returns the way to close it from inside (the back arrow).
 */
type Layer = { close: () => void; done: boolean };

const layers: Layer[] = [];
let ignoreNext = 0;
let listening = false;

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  // Capture, so it runs before the app's own screen-by-screen back.
  window.addEventListener(
    "popstate",
    (event) => {
      if (ignoreNext > 0) {
        ignoreNext -= 1;
        event.stopImmediatePropagation();
        return;
      }
      const top = layers.pop();
      if (!top) return;
      top.done = true;
      event.stopImmediatePropagation();
      top.close();
    },
    true,
  );
}

/** Is a popup open right now (one the back button would close)? */
export function backLayersOpen() {
  return layers.length;
}

export function useBackToClose(open: boolean, close: () => void) {
  const layerRef = useRef<Layer | null>(null);
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open || Platform.OS !== "web" || typeof window === "undefined" || !window.history) return;
    listen();
    const layer: Layer = { close: () => closeRef.current(), done: false };
    layers.push(layer);
    layerRef.current = layer;
    window.history.pushState(window.history.state, "");
    return () => {
      layerRef.current = null;
      if (layer.done) return;
      // Closed some other way: take our entry off the history as well.
      layer.done = true;
      const at = layers.indexOf(layer);
      if (at >= 0) layers.splice(at, 1);
      ignoreNext += 1;
      window.history.back();
    };
  }, [open]);

  return useCallback(() => {
    const layer = layerRef.current;
    if (Platform.OS === "web" && layer && !layer.done && typeof window !== "undefined") {
      // Same as the phone's back: the history and the popup stay in step.
      const at = layers.indexOf(layer);
      if (at === layers.length - 1) {
        window.history.back();
        return;
      }
    }
    closeRef.current();
  }, []);
}
