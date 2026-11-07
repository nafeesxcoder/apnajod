/**
 * The layout of the window, re-read on every resize.
 *
 * Separate from breakpoints.ts because this needs react-native and that
 * does not: the rules are plain arithmetic and are tested as such, while
 * importing react-native into a test fails on its Flow syntax.
 */
import { useWindowDimensions } from "react-native";

import { type Layout, layoutFor } from "./breakpoints";

/**
 * Dragging a browser window narrow turns the rail back into a bottom bar
 * without a reload, because this re-renders.
 */
export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  return layoutFor(width);
}
