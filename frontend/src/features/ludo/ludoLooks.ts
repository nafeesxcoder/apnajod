/**
 * How Ludo can look: six boards, five dice and four token styles - our own
 * designs. Pure, so it can be tested. The store (server) says which are
 * free and which cost coins; this says how each one is drawn.
 */
export type BoardTheme = {
  name: string;
  /** The room behind the board, top to bottom. */
  bg: [string, string, string];
  /** The board's frame. */
  frame: [string, string, string];
  /** Squares, their lines, the stars and the middle. */
  cell: string;
  line: string;
  star: string;
  center: string;
  /** Text and glass on the room. */
  text: string;
  textSoft: string;
  glass: string;
  glassBorder: string;
  /** A little picture in the middle of the board, if any. */
  centerMark?: string;
};

export const BOARD_THEMES: Record<string, BoardTheme> = {
  royal: { name: "Royal Night", bg: ["#2B1466", "#1A0D45", "#0C0626"], frame: ["#FFE9A3", "#F6C445", "#C48A12"], cell: "#FFF8EB", line: "rgba(60,40,20,0.14)", star: "#C48A12", center: "#F6C445", text: "#FFFFFF", textSoft: "#C9BDF5", glass: "rgba(255,255,255,0.07)", glassBorder: "rgba(255,255,255,0.14)" },
  classic: { name: "Classic", bg: ["#E8EEF7", "#D7E1EF", "#C3D0E3"], frame: ["#FFFFFF", "#CBD5E1", "#94A3B8"], cell: "#FFFFFF", line: "rgba(15,23,42,0.16)", star: "#64748B", center: "#94A3B8", text: "#0F172A", textSoft: "#475569", glass: "rgba(255,255,255,0.7)", glassBorder: "rgba(15,23,42,0.12)" },
  wood: { name: "Wooden", bg: ["#5B3A1E", "#3E2612", "#24150A"], frame: ["#C98B4E", "#9A5E2B", "#6B3C17"], cell: "#F3E1C2", line: "rgba(90,50,20,0.25)", star: "#9A5E2B", center: "#C98B4E", text: "#FFF7EC", textSoft: "#E8CFAE", glass: "rgba(255,240,220,0.08)", glassBorder: "rgba(255,230,200,0.18)" },
  ocean: { name: "Ocean", bg: ["#0E7490", "#0B4F6C", "#062C43"], frame: ["#A5F3FC", "#22D3EE", "#0891B2"], cell: "#ECFEFF", line: "rgba(8,80,110,0.18)", star: "#0891B2", center: "#22D3EE", text: "#FFFFFF", textSoft: "#BAE6FD", glass: "rgba(255,255,255,0.08)", glassBorder: "rgba(165,243,252,0.22)", centerMark: "🌊" },
  neon: { name: "Neon", bg: ["#111827", "#0B0B1A", "#000000"], frame: ["#F0ABFC", "#E879F9", "#22D3EE"], cell: "#1E1B3A", line: "rgba(232,121,249,0.35)", star: "#22D3EE", center: "#E879F9", text: "#FFFFFF", textSoft: "#C4B5FD", glass: "rgba(232,121,249,0.08)", glassBorder: "rgba(34,211,238,0.3)" },
  diwali: { name: "Diwali", bg: ["#7F1D1D", "#4C0519", "#2A0310"], frame: ["#FDE68A", "#F59E0B", "#B45309"], cell: "#FFF7E6", line: "rgba(180,83,9,0.22)", star: "#EA580C", center: "#F59E0B", text: "#FFF7E6", textSoft: "#FCD9A8", glass: "rgba(255,237,213,0.08)", glassBorder: "rgba(253,230,138,0.22)", centerMark: "🪔" },
};

export type DiceSkin = { name: string; face: [string, string]; edge: string; pip: string; special: string };
export const DICE_SKINS: Record<string, DiceSkin> = {
  classic: { name: "Classic", face: ["#FFFFFF", "#F1EEF9"], edge: "#C9C4DE", pip: "#1F1640", special: "#D7263D" },
  gold: { name: "Gold", face: ["#FFF3B0", "#F2C94C"], edge: "#B7862A", pip: "#5A3E07", special: "#8B1E1E" },
  ruby: { name: "Ruby", face: ["#FF6B81", "#C81D3A"], edge: "#7A0E22", pip: "#FFFFFF", special: "#FFE08A" },
  emerald: { name: "Emerald", face: ["#6EE7B7", "#059669"], edge: "#03543F", pip: "#FFFFFF", special: "#FEF08A" },
  galaxy: { name: "Galaxy", face: ["#6D28D9", "#1E1B4B"], edge: "#0B0A24", pip: "#E0E7FF", special: "#F0ABFC" },
};

export type TokenStyle = { name: string; mark: string | null; shape: "round" | "gem" };
export const TOKEN_STYLES: Record<string, TokenStyle> = {
  glossy: { name: "Glossy", mark: null, shape: "round" },
  star: { name: "Star", mark: "★", shape: "round" },
  gem: { name: "Gem", mark: null, shape: "gem" },
  crown: { name: "Crown", mark: "♛", shape: "round" },
};

export const SOUND_PACKS = ["classic", "wood", "marble", "arcade", "soft", "bubbles", "dhol"] as const;

export type LudoPrefs = { theme: string; sound: string; dice: string; token: string; speed: "normal" | "fast"; vibrate: boolean };
export const DEFAULT_PREFS: LudoPrefs = { theme: "royal", sound: "classic", dice: "classic", token: "glossy", speed: "normal", vibrate: true };

/** Settings read from the phone, with anything unknown put back to the default. */
export function cleanPrefs(raw: unknown): LudoPrefs {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<LudoPrefs>;
  return {
    theme: value.theme && BOARD_THEMES[value.theme] ? value.theme : DEFAULT_PREFS.theme,
    sound: value.sound && (SOUND_PACKS as readonly string[]).includes(value.sound) ? value.sound : DEFAULT_PREFS.sound,
    dice: value.dice && DICE_SKINS[value.dice] ? value.dice : DEFAULT_PREFS.dice,
    token: value.token && TOKEN_STYLES[value.token] ? value.token : DEFAULT_PREFS.token,
    speed: value.speed === "fast" ? "fast" : "normal",
    vibrate: value.vibrate !== false,
  };
}

/** A store key ("theme.wood") to its kind and look ("theme", "wood"). */
export function splitKey(key: string): { kind: string; look: string } {
  const [kind = "", look = ""] = key.split(".");
  return { kind, look };
}

/** Which setting a store kind changes. */
export const PREF_OF: Record<string, keyof LudoPrefs | null> = { theme: "theme", sound: "sound", dice: "dice", token: "token", emoji: null, chat: null };

/** Settings using something no longer unlocked (or never) fall back to the free look. */
export function allowedPrefs(prefs: LudoPrefs, unlocked: string[]): LudoPrefs {
  const has = (kind: string, look: string) => unlocked.includes(`${kind}.${look}`);
  return {
    ...prefs,
    theme: has("theme", prefs.theme) ? prefs.theme : DEFAULT_PREFS.theme,
    sound: has("sound", prefs.sound) ? prefs.sound : DEFAULT_PREFS.sound,
    dice: has("dice", prefs.dice) ? prefs.dice : DEFAULT_PREFS.dice,
    token: has("token", prefs.token) ? prefs.token : DEFAULT_PREFS.token,
  };
}

/** Milliseconds per square a token takes. */
export const stepMs = (speed: LudoPrefs["speed"]) => (speed === "fast" ? 85 : 150);
