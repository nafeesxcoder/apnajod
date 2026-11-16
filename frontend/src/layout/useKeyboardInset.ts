/**
 * The on-screen keyboard's height, as padding to apply under a composer.
 *
 * Web: measured from visualViewport (KeyboardAvoidingView does nothing there).
 * Android: the keyboard's own height from React Native's keyboard events.
 * The app draws edge-to-edge, so the window no longer shrinks for the
 * keyboard, and a KeyboardAvoidingView deep inside the chat measured itself
 * against its parent rather than the screen: the chat box stayed hidden
 * behind the keyboard. iPhone: 0, KeyboardAvoidingView handles it.
 *
 * Separate from keyboardInset.ts because this needs react-native and the
 * arithmetic does not.
 */
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

import { coveredHeight } from "./keyboardInset";

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === "android") {
      const shown = Keyboard.addListener("keyboardDidShow", (event) =>
        setInset(Math.max(0, Math.round(event?.endCoordinates?.height ?? 0))),
      );
      const hidden = Keyboard.addListener("keyboardDidHide", () => setInset(0));
      return () => {
        shown.remove();
        hidden.remove();
      };
    }
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () =>
      setInset(
        coveredHeight(window.innerHeight, viewport.height, viewport.offsetTop),
      );

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
