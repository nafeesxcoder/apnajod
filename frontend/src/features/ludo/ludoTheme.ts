/** Ludo's own look: a royal night-blue room, a gold-framed board. */
export const L = {
  bgTop: "#2B1466",
  bgMid: "#1A0D45",
  bgBottom: "#0C0626",
  glass: "rgba(255,255,255,0.07)",
  glassStrong: "rgba(255,255,255,0.12)",
  glassBorder: "rgba(255,255,255,0.14)",
  text: "#FFFFFF",
  textSoft: "#C9BDF5",
  textMuted: "#8F84BE",
  gold: "#F6C445",
  goldLight: "#FFE9A3",
  goldDark: "#C48A12",
  boardCream: "#FFF8EB",
  green: "#22C55E",
  red: "#F43F5E",
};

/**
 * The board theme chosen in Settings paints the room: these values change
 * with it (everything reads them while drawing).
 */
export function setActiveTheme(theme: { bg: [string, string, string]; frame: [string, string, string]; cell: string; text: string; textSoft: string; glass: string; glassBorder: string }) {
  L.bgTop = theme.bg[0];
  L.bgMid = theme.bg[1];
  L.bgBottom = theme.bg[2];
  L.goldLight = theme.frame[0];
  L.gold = theme.frame[1];
  L.goldDark = theme.frame[2];
  L.boardCream = theme.cell;
  L.text = theme.text;
  L.textSoft = theme.textSoft;
  L.textMuted = theme.textSoft;
  L.glass = theme.glass;
  L.glassBorder = theme.glassBorder;
  L.glassStrong = theme.glass.replace(/[\d.]+\)$/, (a) => `${Math.min(0.9, parseFloat(a) * 1.8).toFixed(2)})`);
}

/** Lighter and darker shades of each seat's colour (red, green, yellow, blue). */
export const SEAT_LIGHT = ["#FF8A80", "#81E68A", "#FFE57A", "#7CC4FF"];
export const SEAT_DARK = ["#B71C1C", "#1B6B2A", "#C79A00", "#0D4FA0"];
