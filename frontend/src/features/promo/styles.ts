/**
 * Looks for the offer popup. The keys must match STYLES on the server.
 * Pure data, so it can be tested without React Native.
 */
export type PromoStyle = {
  key: string;
  name: string;
  colors: [string, string];
  ink: string;
  /** The button and the coupon ticket. */
  accent: string;
  accentInk: string;
  /** What bursts out when the popup opens. */
  burst: string[];
};

export const PROMO_STYLES: Record<string, PromoStyle> = {
  classic: { key: "classic", name: "Apnajoda", colors: ["#7A1630", "#1F3A68"], ink: "#FFFFFF", accent: "#FFD166", accentInk: "#3A1A00", burst: ["✨", "💖", "⭐"] },
  gold: { key: "gold", name: "Black & Gold", colors: ["#111111", "#3B2A06"], ink: "#FDE68A", accent: "#F5C542", accentInk: "#1A1200", burst: ["✨", "⭐", "💛"] },
  midnight: { key: "midnight", name: "Midnight", colors: ["#0B1023", "#4338CA"], ink: "#E0E7FF", accent: "#A5B4FC", accentInk: "#0B1023", burst: ["⭐", "✨", "🌙"] },
  sunset: { key: "sunset", name: "Sunset", colors: ["#F97316", "#DB2777"], ink: "#FFFFFF", accent: "#FFFFFF", accentInk: "#9D174D", burst: ["🔥", "✨", "🧡"] },
  love: { key: "love", name: "Love", colors: ["#881337", "#F43F5E"], ink: "#FFF1F2", accent: "#FFFFFF", accentInk: "#9F1239", burst: ["💖", "💕", "🌹"] },
  diwali: { key: "diwali", name: "Diwali", colors: ["#4A1209", "#D9771A"], ink: "#FFF7E6", accent: "#FCD34D", accentInk: "#4A1209", burst: ["🪔", "✨", "🎆"] },
  eid: { key: "eid", name: "Eid", colors: ["#053B2F", "#0F766E"], ink: "#FEF3C7", accent: "#FCD34D", accentInk: "#053B2F", burst: ["🌙", "⭐", "✨"] },
  holi: { key: "holi", name: "Holi", colors: ["#DB2777", "#7C3AED"], ink: "#FFFFFF", accent: "#FDE047", accentInk: "#581C87", burst: ["🎨", "💦", "🌈"] },
};

export type Promo = {
  id: string;
  headline: string;
  title: string | null;
  message: string | null;
  buttonLabel: string | null;
  couponCode: string | null;
  style: string;
  endsAt: string | null;
  active?: boolean;
};

export function promoStyle(key: string | null | undefined): PromoStyle {
  return PROMO_STYLES[key ?? ""] ?? PROMO_STYLES.classic!;
}

/** "2d 04:12:09", "04:12:09" or null once it has ended (or has no end). */
export function countdown(endsAt: string | null | undefined, now = Date.now()) {
  if (!endsAt) return null;
  const left = Math.floor((new Date(endsAt).getTime() - now) / 1000);
  if (!Number.isFinite(left) || left <= 0) return null;
  const days = Math.floor(left / 86400);
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(Math.floor((left % 86400) / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}
