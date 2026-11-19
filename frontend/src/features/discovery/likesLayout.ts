/**
 * How many "who liked you" cards fit a row, kept apart from the screen so it
 * can be tested on its own. Desktop gets three in a row, a tablet two, and a
 * phone one column.
 */
import type { Layout } from "../../layout/breakpoints";

export function likeColumnCount(layout: Pick<Layout, "isWide" | "isDesktop">): 1 | 2 | 3 {
  if (layout.isDesktop) return 3;
  if (layout.isWide) return 2;
  return 1;
}

export type CardWidth = `${number}%`;

/** Each card's share of the row. The gaps between cards take the rest. */
export function likeCardWidth(columns: 1 | 2 | 3): CardWidth {
  if (columns === 3) return "31%";
  if (columns === 2) return "48%";
  return "100%";
}
