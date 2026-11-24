/**
 * The 20 chat backgrounds. A chat stores one id (`background`); unknown or
 * missing ids show the classic cream. `glyph` is a small shape that floats
 * up slowly behind the messages (none for the still ones).
 */
export type ChatBackground = {
  id: string;
  name: string;
  colors: [string, string];
  glyph?: { char: string; color: string };
};

const HEART = (color: string) => ({ char: "♥", color });
const PETAL = (color: string) => ({ char: "✿", color });
const STAR = (color: string) => ({ char: "✦", color });
const BUBBLE = (color: string) => ({ char: "○", color });
const SPARK = (color: string) => ({ char: "✧", color });

export const CHAT_BACKGROUNDS: ChatBackground[] = [
  { id: "classic", name: "Classic cream", colors: ["#FDF7F4", "#F4E9E4"] },
  { id: "rose-glow", name: "Rose glow", colors: ["#FCE4EC", "#F8BBD0"], glyph: HEART("#E91E63") },
  { id: "sunset", name: "Sunset", colors: ["#FFE0B2", "#F48FB1"] },
  { id: "lavender-dream", name: "Lavender dream", colors: ["#EDE7F6", "#D1C4E9"], glyph: STAR("#7E57C2") },
  { id: "night-sky", name: "Night sky", colors: ["#1A237E", "#0D1B3E"], glyph: STAR("#FFD54F") },
  { id: "ocean-blue", name: "Ocean blue", colors: ["#E3F2FD", "#90CAF9"], glyph: BUBBLE("#1E88E5") },
  { id: "mint-fresh", name: "Mint fresh", colors: ["#E0F2F1", "#B2DFDB"] },
  { id: "golden-hour", name: "Golden hour", colors: ["#FFF8E1", "#FFD54F"], glyph: SPARK("#F9A825") },
  { id: "midnight-rose", name: "Midnight rose", colors: ["#2B0A16", "#6B1530"], glyph: HEART("#F48FB1") },
  { id: "peach-cloud", name: "Peach cloud", colors: ["#FFF3E0", "#FFCCBC"] },
  { id: "romantic-red", name: "Romantic red", colors: ["#FFEBEE", "#EF9A9A"], glyph: HEART("#C62828") },
  { id: "monsoon", name: "Monsoon", colors: ["#ECEFF1", "#90A4AE"], glyph: BUBBLE("#37474F") },
  { id: "spring-petals", name: "Spring petals", colors: ["#FFF0F5", "#FFD1DC"], glyph: PETAL("#E57373") },
  { id: "chai-brown", name: "Chai brown", colors: ["#FFF8F0", "#D7CCC8"] },
  { id: "deep-plum", name: "Deep plum", colors: ["#311B92", "#4A148C"], glyph: SPARK("#CE93D8") },
  { id: "aurora", name: "Aurora", colors: ["#E0F7FA", "#B39DDB"], glyph: STAR("#26C6DA") },
  { id: "blush", name: "Blush", colors: ["#FFF5F7", "#F8C8D4"] },
  { id: "emerald-garden", name: "Emerald garden", colors: ["#E8F5E9", "#A5D6A7"], glyph: PETAL("#2E7D32") },
  { id: "charcoal", name: "Charcoal", colors: ["#263238", "#121212"], glyph: SPARK("#B0BEC5") },
  { id: "diwali-glow", name: "Diwali glow", colors: ["#FFF3E0", "#FFB74D"], glyph: SPARK("#FF6F00") },
];

export function backgroundFor(id: string | undefined): ChatBackground {
  return CHAT_BACKGROUNDS.find((background) => background.id === id) ?? CHAT_BACKGROUNDS[0]!;
}
