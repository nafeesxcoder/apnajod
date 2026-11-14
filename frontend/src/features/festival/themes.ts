/**
 * Festival themes the admin can put on the whole app with one click.
 *
 * Each theme is only colours, words and emoji - no artwork to license and
 * nothing to download. The keys must match THEME_KEYS on the server.
 */
import type { TextTheme } from "../stories/editor/themes";

export type FestivalTheme = {
  key: string;
  name: string;
  emoji: string;
  /** The greeting when the admin does not write one. */
  greeting: string;
  /** The Home banner, top to bottom. */
  colors: [string, string];
  /** Words on the banner. */
  ink: string;
  /** The greeting line on Home, on the light page. */
  accent: string;
  /** The row of decoration across the banner. */
  ornament: string;
  /** What falls down the screen the first time the app opens that day. */
  particles: { emoji?: string[]; dots?: string[] };
  /** Extra backgrounds for text stories while the theme is on. */
  textStories: TextTheme[];
  /** What moves in the Home banner. */
  scene: "diyas" | "lanterns" | "colours" | "snow" | "fireworks" | "hearts" | "garland";
  /** The big show the first time the app opens that day. */
  show: "fall" | "rise" | "fireworks";
  /** Colours for fireworks, puffs and lights. */
  sparks: string[];
};

export const FESTIVAL_THEMES: Record<string, FestivalTheme> = {
  diwali: {
    key: "diwali",
    name: "Diwali",
    emoji: "🪔",
    greeting: "Happy Diwali",
    colors: ["#4A1209", "#D9771A"],
    ink: "#FFF7E6",
    accent: "#C2410C",
    ornament: "🪔  ✨  🪔  ✨  🪔",
    particles: { emoji: ["✨", "🪔", "✨", "🎆"] },
    textStories: [
      { id: "diwali-night", name: "Diwali Night", colors: ["#1A0B2E", "#7A2E0E"] },
      { id: "diya-gold", name: "Diya Gold", colors: ["#B45309", "#FCD34D"] },
      { id: "rangoli", name: "Rangoli", colors: ["#BE185D", "#F59E0B"] },
    ],
    scene: "diyas",
    show: "fireworks",
    sparks: ["#FFD166", "#FF9F1C", "#FF5E5B", "#FFFFFF"],
  },
  eid_ul_fitr: {
    key: "eid_ul_fitr",
    name: "Eid ul-Fitr",
    emoji: "🌙",
    greeting: "Eid Mubarak",
    colors: ["#053B2F", "#0F766E"],
    ink: "#FEF3C7",
    accent: "#047857",
    ornament: "🌙  ⭐  🕌  ⭐  🌙",
    particles: { emoji: ["⭐", "✨", "🌙"] },
    textStories: [
      { id: "eid-night", name: "Eid Night", colors: ["#022C22", "#065F46"] },
      { id: "crescent-gold", name: "Crescent Gold", colors: ["#065F46", "#D4A017"] },
      { id: "moonlight", name: "Moonlight", colors: ["#1E293B", "#475569"] },
    ],
    scene: "lanterns",
    show: "fall",
    sparks: ["#FDE68A", "#FFFFFF", "#A7F3D0"],
  },
  eid_ul_adha: {
    key: "eid_ul_adha",
    name: "Eid ul-Adha",
    emoji: "🌙",
    greeting: "Eid al-Adha Mubarak",
    colors: ["#14532D", "#A16207"],
    ink: "#FEFCE8",
    accent: "#15803D",
    ornament: "🌙  ✨  🕌  ✨  🌙",
    particles: { emoji: ["✨", "⭐"] },
    textStories: [
      { id: "adha-green", name: "Eid Green", colors: ["#14532D", "#166534"] },
      { id: "adha-gold", name: "Eid Gold", colors: ["#713F12", "#CA8A04"] },
    ],
    scene: "lanterns",
    show: "fall",
    sparks: ["#FDE68A", "#FFFFFF", "#BBF7D0"],
  },
  holi: {
    key: "holi",
    name: "Holi",
    emoji: "🎨",
    greeting: "Happy Holi",
    colors: ["#DB2777", "#F59E0B"],
    ink: "#FFFFFF",
    accent: "#DB2777",
    ornament: "🎨  💦  🌈  💦  🎨",
    particles: { dots: ["#EC4899", "#F59E0B", "#22C55E", "#3B82F6", "#A855F7", "#EF4444"] },
    textStories: [
      { id: "gulal-pink", name: "Gulal Pink", colors: ["#EC4899", "#A855F7"] },
      { id: "holi-sun", name: "Holi Sun", colors: ["#F59E0B", "#EF4444"] },
      { id: "holi-green", name: "Holi Green", colors: ["#22C55E", "#3B82F6"] },
    ],
    scene: "colours",
    show: "fall",
    sparks: ["#EC4899", "#F59E0B", "#22C55E", "#3B82F6", "#A855F7", "#EF4444"],
  },
  christmas: {
    key: "christmas",
    name: "Christmas",
    emoji: "🎄",
    greeting: "Merry Christmas",
    colors: ["#7F1D1D", "#14532D"],
    ink: "#FFFFFF",
    accent: "#B91C1C",
    ornament: "🎄  ❄️  🎁  ❄️  🎄",
    particles: { emoji: ["❄️", "❄️", "✨"] },
    textStories: [
      { id: "xmas-red", name: "Christmas Red", colors: ["#7F1D1D", "#DC2626"] },
      { id: "xmas-pine", name: "Pine", colors: ["#052E16", "#15803D"] },
    ],
    scene: "snow",
    show: "fall",
    sparks: ["#EF4444", "#22C55E", "#FACC15", "#60A5FA"],
  },
  new_year: {
    key: "new_year",
    name: "New Year",
    emoji: "🎆",
    greeting: "Happy New Year",
    colors: ["#0F172A", "#4338CA"],
    ink: "#FDE68A",
    accent: "#4F46E5",
    ornament: "🎆  ✨  🥂  ✨  🎆",
    particles: { emoji: ["✨", "🎉", "🎊"] },
    textStories: [
      { id: "midnight", name: "Midnight", colors: ["#020617", "#312E81"] },
      { id: "golden-hour", name: "Golden Hour", colors: ["#1E1B4B", "#B45309"] },
    ],
    scene: "fireworks",
    show: "fireworks",
    sparks: ["#FDE68A", "#F472B6", "#60A5FA", "#A78BFA", "#FFFFFF"],
  },
  valentines: {
    key: "valentines",
    name: "Valentine's Day",
    emoji: "💖",
    greeting: "Happy Valentine's Day",
    colors: ["#881337", "#F43F5E"],
    ink: "#FFF1F2",
    accent: "#E11D48",
    ornament: "💖  🌹  💌  🌹  💖",
    particles: { emoji: ["💖", "💕", "🌹"] },
    textStories: [
      { id: "love-red", name: "Love", colors: ["#881337", "#E11D48"] },
      { id: "blush", name: "Blush", colors: ["#F43F5E", "#FDA4AF"] },
      { id: "rose-night", name: "Rose Night", colors: ["#1F0A1A", "#9F1239"] },
    ],
    scene: "hearts",
    show: "rise",
    sparks: ["#FDA4AF", "#FFFFFF", "#FB7185"],
  },
  raksha_bandhan: {
    key: "raksha_bandhan",
    name: "Raksha Bandhan",
    emoji: "🧡",
    greeting: "Happy Raksha Bandhan",
    colors: ["#9A3412", "#FBBF24"],
    ink: "#FFFBEB",
    accent: "#EA580C",
    ornament: "🌼  🧡  🎀  🧡  🌼",
    particles: { emoji: ["🌼", "✨"] },
    textStories: [
      { id: "rakhi-saffron", name: "Saffron", colors: ["#C2410C", "#FBBF24"] },
      { id: "rakhi-marigold", name: "Marigold", colors: ["#B45309", "#FDE047"] },
    ],
    scene: "garland",
    show: "fall",
    sparks: ["#FBBF24", "#F97316", "#FDE68A"],
  },
};

/** What the server sends: which theme is on, and the admin's greeting. */
export type ActiveFestival = {
  id: string;
  themeKey: string;
  greeting: string | null;
  startsAt: string | null;
  endsAt: string | null;
  /** Percent off every Premium plan while it is on. */
  offerPercent?: number | null;
  /** When the greeting push went out (once per festival). */
  pushedAt?: string | null;
};

/** The theme to show for what the server sent, or null (unknown key: nothing). */
export function festivalFor(active: ActiveFestival | null | undefined) {
  if (!active) return null;
  const theme = FESTIVAL_THEMES[active.themeKey];
  if (!theme) return null;
  // The server's clock decides; this only covers an app left open past the end.
  if (active.endsAt && new Date(active.endsAt).getTime() <= Date.now()) return null;
  return { ...theme, greeting: active.greeting?.trim() || theme.greeting };
}

/** "Happy Diwali, Aarav!" - or just the greeting without a name. */
export function greetingLine(greeting: string, name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first ? `${greeting}, ${first}!` : `${greeting}!`;
}

/** Once a day per theme: the key the falling decoration remembers. */
export function particlesKey(themeKey: string, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return `apnajoda.festival.${themeKey}.${day}`;
}

/** A festival's own emoji for story stickers: its decoration and what falls, each once. */
export function festivalEmojis(theme: FestivalTheme) {
  const fromOrnament = theme.ornament.split(/\s+/).filter(Boolean);
  return Array.from(new Set([theme.emoji, ...fromOrnament, ...(theme.particles.emoji ?? [])]));
}

export type FestivalWishPayload = { themeKey: string; greeting: string };

/** Already wished this festival in this chat? Then the chip steps aside. */
export function alreadyWished(
  messages: { mine?: boolean; type?: string; festival?: FestivalWishPayload | null }[],
  themeKey: string,
) {
  return messages.some((message) => message.mine && message.type === "festival" && message.festival?.themeKey === themeKey);
}
