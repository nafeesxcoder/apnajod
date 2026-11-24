/**
 * The 20 romantic chat backgrounds: a soft colour, a pattern of small hearts,
 * roses, love letters, couples and so on repeated across the screen, and a
 * few shapes that float slowly upward. A chat stores one id (`background`).
 * "classic" (the plain cream, no picture) and any unknown id show no picture.
 */
export type ChatBackground = {
  id: string;
  name: string;
  colors: [string, string];
  /** The pattern repeated across the background. */
  pattern: { glyph: string; color: string; opacity: number };
  /** The shape that floats up slowly. */
  float: { glyph: string; color: string };
};

const bg = (
  id: string,
  name: string,
  colors: [string, string],
  pattern: string,
  patternColor: string,
  floatGlyph: string,
  floatColor: string,
  patternOpacity = 0.16,
): ChatBackground => ({
  id,
  name,
  colors,
  pattern: { glyph: pattern, color: patternColor, opacity: patternOpacity },
  float: { glyph: floatGlyph, color: floatColor },
});

export const CHAT_BACKGROUNDS: ChatBackground[] = [
  bg("red-hearts", "Red hearts", ["#FFE3E8", "#FFB3C1"], "❤", "#E0245E", "♥", "#E0245E"),
  bg("rose-garden", "Rose garden", ["#FFF0F3", "#F8C9D4"], "🌹", "#C2185B", "✿", "#E91E63", 0.2),
  bg("love-letters", "Love letters", ["#FFF8F0", "#F5E1C8"], "💌", "#8D6E63", "♥", "#E91E63", 0.2),
  bg("couple-goals", "Couple goals", ["#FFE4EC", "#F7B6C8"], "💑", "#AD1457", "♥", "#D81B60", 0.22),
  bg("sweet-kisses", "Sweet kisses", ["#FFEFF5", "#FBD0E0"], "💋", "#C2185B", "♥", "#EC407A", 0.2),
  bg("candle-night", "Candle night", ["#2A1020", "#5B1F35"], "🕯", "#FFB74D", "✦", "#FFD54F", 0.18),
  bg("moonlit-hearts", "Moonlit hearts", ["#1B1F4B", "#3B2667"], "🌙", "#FFE082", "♥", "#F48FB1", 0.2),
  bg("starry-love", "Starry love", ["#0F1A3D", "#2B1E5C"], "✨", "#FFF59D", "✦", "#FFD54F", 0.2),
  bg("golden-hearts", "Golden hearts", ["#FFF6DB", "#F9DA8A"], "💛", "#F9A825", "♥", "#FBC02D", 0.2),
  bg("cherry-blossom", "Cherry blossom", ["#FFF0F4", "#FFD6E0"], "🌸", "#E91E63", "✿", "#F06292", 0.22),
  bg("lavender-promise", "Lavender promise", ["#F3EEFF", "#D9C8F5"], "💜", "#7E57C2", "♥", "#9575CD", 0.2),
  bg("butterfly-love", "Butterfly love", ["#EAF7F4", "#BFE8DC"], "🦋", "#00897B", "✿", "#26A69A", 0.2),
  bg("champagne-toast", "Champagne toast", ["#FFF8EC", "#F3DDB0"], "🥂", "#B8860B", "✦", "#D4A017", 0.18),
  bg("coffee-date", "Coffee date", ["#FBF3EC", "#E6CDB4"], "☕", "#6D4C41", "♡", "#8D6E63", 0.16),
  bg("gift-of-love", "Gift of love", ["#FFF0F0", "#FAC8C8"], "🎁", "#C62828", "♥", "#E53935", 0.18),
  bg("infinity", "Infinity", ["#EEF3FF", "#C5D4F7"], "∞", "#1F4D7A", "♥", "#E53935", 0.22),
  bg("sunset-kiss", "Sunset kiss", ["#FFD6C9", "#F59E8B"], "♥", "#FFFFFF", "♥", "#FFFFFF", 0.22),
  bg("red-velvet", "Red velvet", ["#5C0F1F", "#8E1B33"], "❤", "#FF8A80", "♥", "#FF8A80", 0.14),
  bg("pastel-hearts", "Pastel hearts", ["#FFF5F9", "#F0E1FF"], "♡", "#CE93D8", "♡", "#F48FB1", 0.22),
  bg("forever", "Forever", ["#1F2E4D", "#4A2340"], "♥", "#F48FB1", "✦", "#FFD54F", 0.14),
];

/** The plain option: no picture, just the cream. */
export const PLAIN_BACKGROUND_ID = "classic";

/** What the settings sheet offers: the plain option first, then the twenty. */
export const BACKGROUND_CHOICES: { id: string; name: string; colors: [string, string] }[] = [
  { id: PLAIN_BACKGROUND_ID, name: "Plain cream", colors: ["#FDF7F4", "#F4E9E4"] },
  ...CHAT_BACKGROUNDS,
];

/** The picture for a chat's id, or null for the plain option and for unknown ids. */
export function backgroundFor(id: string | undefined): ChatBackground | null {
  return CHAT_BACKGROUNDS.find((background) => background.id === id) ?? null;
}
