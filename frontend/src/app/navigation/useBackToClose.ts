import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

/**
 * On the web, the phone's back button closes an open popup instead of
 * leaving the screen behind it. Opening the popup adds a history entry;
 * back takes it off again and closes the popup, so the app stays where it
 * was (Home stays Home). The native app already does this through the
 * Modal's onRequestClose.
 *
 * Returns the way to close it from inside (the back arrow): through the
 * history on the web, so no stray entry is left behind.
 */
export function useBackToClose(open: boolean, close: () => void) {
  const pushed = useRef(false);
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open || Platform.OS !== "web" || typeof window === "undefined") return;
    window.history.pushState(window.history.state, "");
    pushed.current = true;
    const onPop = (event: PopStateEvent) => {
      if (!pushed.current) return;
      pushed.current = false;
      // Ours: the app's own back handling must not move the screen.
      event.stopImmediatePropagation();
      closeRef.current();
    };
    window.addEventListener("popstate", onPop, true);
    return () => window.removeEventListener("popstate", onPop, true);
  }, [open]);

  return useCallback(() => {
    if (Platform.OS === "web" && pushed.current && typeof window !== "undefined") {
      window.history.back();
    } else {
      closeRef.current();
    }
  }, []);
}
