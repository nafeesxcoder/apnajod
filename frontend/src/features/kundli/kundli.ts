/**
 * Kundli basics for the app: the 12 Rashis and 27 Nakshatras, which
 * Nakshatras fall in which Rashi, and finding both from a birth date and
 * time (India time) for people who do not know them.
 *
 * Pure code, no React Native, so it can be tested.
 */

export const RASHIS = [
  { n: 1, name: "Mesha", hindi: "मेष", symbol: "♈", english: "Aries" },
  { n: 2, name: "Vrishabha", hindi: "वृषभ", symbol: "♉", english: "Taurus" },
  { n: 3, name: "Mithuna", hindi: "मिथुन", symbol: "♊", english: "Gemini" },
  { n: 4, name: "Karka", hindi: "कर्क", symbol: "♋", english: "Cancer" },
  { n: 5, name: "Simha", hindi: "सिंह", symbol: "♌", english: "Leo" },
  { n: 6, name: "Kanya", hindi: "कन्या", symbol: "♍", english: "Virgo" },
  { n: 7, name: "Tula", hindi: "तुला", symbol: "♎", english: "Libra" },
  { n: 8, name: "Vrishchika", hindi: "वृश्चिक", symbol: "♏", english: "Scorpio" },
  { n: 9, name: "Dhanu", hindi: "धनु", symbol: "♐", english: "Sagittarius" },
  { n: 10, name: "Makara", hindi: "मकर", symbol: "♑", english: "Capricorn" },
  { n: 11, name: "Kumbha", hindi: "कुंभ", symbol: "♒", english: "Aquarius" },
  { n: 12, name: "Meena", hindi: "मीन", symbol: "♓", english: "Pisces" },
] as const;

export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
  "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
  "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati",
] as const;

/** The Rashis a Nakshatra falls in (each has 4 padas, each Rashi 9). */
export function rashisOf(nakshatra: number): number[] {
  const first = (nakshatra - 1) * 4;
  const from = Math.floor(first / 9) + 1;
  const to = Math.floor((first + 3) / 9) + 1;
  return from === to ? [from] : [from, to];
}

/** The Nakshatras that can go with a Rashi, in order. */
export function nakshatrasIn(rashi: number): number[] {
  return NAKSHATRAS.map((_, i) => i + 1).filter((n) => rashisOf(n).includes(rashi));
}

export function rashiName(n: number | null | undefined) {
  return n ? (RASHIS[n - 1]?.name ?? null) : null;
}

export function nakshatraName(n: number | null | undefined) {
  return n ? (NAKSHATRAS[n - 1] ?? null) : null;
}

// --- The Moon's place --------------------------------------------------

const rad = Math.PI / 180;
const norm = (deg: number) => ((deg % 360) + 360) % 360;

/** Julian Day for a UTC moment. */
export function julianDay(date: Date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Meeus, Astronomical Algorithms, ch. 47: the main terms of the Moon's
// longitude. [D, M, M', F, coefficient in millionths of a degree]
const TERMS: [number, number, number, number, number][] = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390], [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810], [4, -1, -2, 0, 759], [0, 2, -1, 0, -713], [2, 2, -1, 0, -700],
  [2, 1, -2, 0, 691], [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520], [1, 0, -2, 0, -487], [2, 1, 0, -2, -399], [0, 0, 2, -2, -381],
  [1, 1, 1, 0, 351], [3, 0, -2, 0, -340], [4, 0, -3, 0, 330], [2, -1, 2, 0, 327],
  [0, 2, 1, 0, -323], [1, 1, -1, 0, 299], [2, 0, 3, 0, 294],
];

/** The Moon's geocentric (tropical) longitude in degrees at a Julian Day (TT). */
export function moonLongitude(jd: number) {
  const T = (jd - 2451545) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T * T * T) / 538841 - (T ** 4) / 65194000;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T * T * T) / 545868 - (T ** 4) / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T * T * T) / 24490000;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699 - (T ** 4) / 14712000;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T - (T * T * T) / 3526000 + (T ** 4) / 863310000;
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  let sum = 0;
  for (const [d, m, mp, f, coeff] of TERMS) {
    const e = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    sum += coeff * e * Math.sin((d * D + m * M + mp * Mp + f * F) * rad);
  }
  sum += 3958 * Math.sin(A1 * rad) + 1962 * Math.sin((Lp - F) * rad) + 318 * Math.sin(A2 * rad);
  return norm(Lp + sum / 1e6);
}

/** Lahiri ayanamsa (degrees) at a Julian Day: about 23.85° in 2000, growing 50.3" a year. */
export function lahiriAyanamsa(jd: number) {
  return 23.8532 + ((jd - 2451545) / 365.25) * 0.0139689;
}

/**
 * Rashi and Nakshatra from a birth date ("YYYY-MM-DD") and time ("HH:MM",
 * India time). `nearEdge` is true when the Moon was within a quarter degree
 * of a boundary - then a pandit's chart should settle it.
 */
export function fromBirth(day: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{1,2}:\d{2}$/.test(time)) return null;
  const [hh, mm] = time.split(":").map(Number);
  if (hh! > 23 || mm! > 59) return null;
  const utc = new Date(`${day}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00+05:30`);
  if (Number.isNaN(utc.getTime())) return null;
  // Terrestrial time runs about a minute ahead of UTC; a minute moves the Moon 0.01°.
  const jd = julianDay(utc) + 69 / 86400;
  const sidereal = norm(moonLongitude(jd) - lahiriAyanamsa(jd));
  const span = 360 / 27;
  const nakshatra = Math.floor(sidereal / span) + 1;
  const rashi = Math.floor(sidereal / 30) + 1;
  const toNakshatraEdge = Math.min(sidereal % span, span - (sidereal % span));
  const toRashiEdge = Math.min(sidereal % 30, 30 - (sidereal % 30));
  return { rashi, nakshatra, sidereal, nearEdge: Math.min(toNakshatraEdge, toRashiEdge) < 0.25 };
}

/** The score's words (English, with the Hindi word) and colour, from the score out of its max. */
export function gunBand(score: number, max: number) {
  const share = score / max;
  if (share >= 33 / 36) return { label: "Excellent match", hindi: "उत्तम", color: "#B45309", emoji: "💫" };
  if (share >= 25 / 36) return { label: "Very good match", hindi: "बहुत अच्छा", color: "#047857", emoji: "✨" };
  if (share >= 18 / 36) return { label: "Good match", hindi: "अच्छा", color: "#1D4ED8", emoji: "🙂" };
  return { label: "Low match", hindi: "कम", color: "#5B5478", emoji: "🌙" };
}

/** "28/36" or "28.5/36". */
export function gunText(score: number, max: number) {
  return `${Number.isInteger(score) ? score : score.toFixed(1)}/${max}`;
}
