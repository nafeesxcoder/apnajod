/**
 * The chat backgrounds: eight themes, each with a mood. Every one is a soft
 * colour gradient with a few small, faint shapes on it (hearts for Romantic,
 * leaves for Nature, and so on), so the messages stay easy to read.
 * A chat stores one id (`background`). "classic" (the plain cream) and any
 * unknown id show none.
 */
export type ChatDecor = {
  /** The little shape, drawn as a character. */
  glyph: string;
  color: string;
  /** How many are scattered across the screen. */
  count: number;
  size: number;
  opacity: number;
};

export type ChatBackground = {
  id: string;
  name: string;
  /** The gradient, from the top colour to the bottom one. */
  colors: [string, string];
  decor: ChatDecor;
};

const theme = (
  id: string,
  name: string,
  colors: [string, string],
  decor: ChatDecor,
): ChatBackground => ({ id, name, colors, decor });

export const CHAT_BACKGROUNDS: ChatBackground[] = [
  theme("romantic", "Romantic", ["#FFE6EE", "#F6B3C8"], { glyph: "♡", color: "#E0457B", count: 14, size: 26, opacity: 0.22 }),
  theme("beautiful", "Beautiful", ["#FFF8FB", "#F9CFE0"], { glyph: "✿", color: "#D9698F", count: 12, size: 24, opacity: 0.2 }),
  theme("emotional", "Emotional", ["#F2E7F8", "#C7A3DA"], { glyph: "✦", color: "#FFFFFF", count: 16, size: 16, opacity: 0.7 }),
  theme("sad", "Sad", ["#E6ECF3", "#C69FAF"], { glyph: "☁", color: "#FFFFFF", count: 9, size: 30, opacity: 0.5 }),
  theme("nature", "Nature", ["#EEF8EA", "#A9D99D"], { glyph: "❦", color: "#4F8F4A", count: 12, size: 24, opacity: 0.22 }),
  theme("calm", "Calm", ["#EAF8F8", "#8FD0CC"], { glyph: "≈", color: "#2F8C88", count: 10, size: 28, opacity: 0.22 }),
  theme("sunset", "Sunset", ["#FFF2E6", "#FFAE84"], { glyph: "☀", color: "#FFFFFF", count: 6, size: 34, opacity: 0.4 }),
  theme("night", "Night", ["#E9EDF8", "#E0A9C0"], { glyph: "✧", color: "#FFFFFF", count: 18, size: 14, opacity: 0.8 }),
];

/** The plain option: no background, just the cream. */
export const PLAIN_BACKGROUND_ID = "classic";

/** What the settings sheet offers: the plain option first, then the eight. */
export const BACKGROUND_CHOICES: ChatBackground[] = [
  {
    id: PLAIN_BACKGROUND_ID,
    name: "Plain cream",
    colors: ["#FBF4FF", "#FBF4FF"],
    decor: { glyph: "", color: "", count: 0, size: 0, opacity: 0 },
  },
  ...CHAT_BACKGROUNDS,
];

/** The background for a chat's id, or null for the plain option and for unknown ids. */
export function backgroundFor(id: string | undefined): ChatBackground | null {
  return CHAT_BACKGROUNDS.find((background) => background.id === id) ?? null;
}
