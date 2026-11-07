/**
 * The on-screen keyboard's height on the web, as padding to apply.
 *
 * Separate from keyboardInset.ts because this needs react-native and the
 * arithmetic does not. Returns 0 everywhere a keyboard cannot overlap the
 * layout: on native, KeyboardAvoidingView already handles it.
 */
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { coveredHeight } from "./keyboardInset";

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
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
