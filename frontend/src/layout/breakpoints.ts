/**
 * One place that decides what counts as a phone, a tablet and a desktop.
 *
 * The app was built phone-first and then caged at 430px wide on the web, so
 * a laptop showed a phone floating in the middle of the screen. Lifting the
 * cage is only half of it: a bottom tab bar, a single column and a
 * push-one-screen-over-another chat are all phone shapes, and they read as
 * a blown-up phone rather than as a desktop app. Every screen that changes
 * shape asks this module rather than inventing a number, so the layout
 * never disagrees with itself at 900px.
 */
/** Below this, one column and a bottom tab bar: a phone, or a split window. */
export const PHONE_MAX = 767;

/** From here, the nav becomes a rail and screens may use two columns. */
export const WIDE_MIN = 768;

/** From here there is room for a sidebar and a detail pane at once. */
export const DESKTOP_MIN = 1024;

/** The left rail's width on a wide screen. */
export const RAIL_WIDTH = 96;

/**
 * The conversation list beside an open chat on a desktop. Narrow enough
 * that the thread still gets most of the window, wide enough for a name,
 * a preview line and a time without any of them truncating.
 */
export const CHAT_LIST_WIDTH = 340;

/**
 * How wide the app itself ever gets. Past this the content stops growing
 * and centres: a chat line that runs 2,000px is unreadable, and a dating
 * deck stretched that far is mostly empty space.
 */
export const APP_MAX_WIDTH = 1440;

/** The phone cage, kept for narrow web windows so the app still looks sized. */
export const PHONE_WIDTH = 430;

export type Breakpoint = "phone" | "tablet" | "desktop";

export function breakpointFor(width: number): Breakpoint {
  if (width >= DESKTOP_MIN) return "desktop";
  if (width >= WIDE_MIN) return "tablet";
  return "phone";
}

export type Layout = {
  width: number;
  breakpoint: Breakpoint;
  /** Nav is a left rail, not a bottom bar. */
  isWide: boolean;
  /** There is room for a list and a detail pane side by side. */
  isDesktop: boolean;
};

export function layoutFor(width: number): Layout {
  const breakpoint = breakpointFor(width);
  return {
    width,
    breakpoint,
    isWide: breakpoint !== "phone",
    isDesktop: breakpoint === "desktop",
  };
}
