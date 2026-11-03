/**
 * Milaan — "Maroon & Gold".
 *
 * Traditional Indian premium: a warm cream page, deep maroon for everything
 * the member acts on, and gold as the single metal. Rose is held back for the
 * romantic register so it keeps its meaning, and the type is a warm near-black
 * rather than a blue-black, so nothing on the page reads cold.
 *
 *   cream      the canvas, the colour of good card stock
 *   maroon     every primary action
 *   gold       the one accent
 *   rose       the romantic register only
 *   ink        warm near-black type
 *
 * Two golds are defined on purpose. `accent` is dark enough to pass WCAG AA
 * as text on cream (4.7:1); `gold` is the brighter leaf used for icons, rules
 * and halos, where text contrast does not apply. The same split exists in the
 * reds: `pink`/`wine` are the deep action maroon, `romance` is the lighter
 * rose, and lightness is what tells them apart.
 *
 * The legacy token names (plum, pink, wine, ivory, …) are kept because the
 * screens reference them by the hundred. They point at this palette, and the
 * literal colours in the screens were migrated onto the same ramps.
 */

// ---- The palette, named for what it is ----
export const palette = {
  cream: '#F8F3E9', // warm cream — the canvas
  paper: '#FFFFFF', // raised cards and fields
  paperWarm: '#FDFAF4', // a half-step above the canvas
  ink: '#1A1416', // warm near-black — primary type
  inkDeep: '#0C0809', // pressed states, deep panels
  inkSoft: '#3C3336', // ink at reading weight
  slate: '#635A5D', // secondary text
  maroon: '#7A1028', // the primary action colour
  maroonDeep: '#4A0A18', // pressed
  maroonSoft: '#B5405C', // maroon at tint strength
  gold: '#8A6722', // the accent, dark enough for text
  goldBright: '#BF9230', // the accent as leaf and decoration
  goldSoft: '#E9D6A8', // accent at tint strength
  rose: '#B5405C', // the romantic register
  roseSoft: '#DB9BA9',
  emerald: '#2E6B4A', // verified, success
  clay: '#A32318', // errors only
  rule: '#E2D9CB', // hairline on cream
  ruleSoft: '#EFE8DB',

  // ---- Legacy member names, repointed. Screens import these directly. ----
  limewash: '#F8F3E9',
  pearl: '#F8F3E9',
  indigo: '#1A1416',
  indigoDeep: '#0C0809',
  indigoSoft: '#3C3336',
  brass: '#8A6722',
  brassSoft: '#E9D6A8',
  champagne: '#8A6722',
  champagneBright: '#BF9230',
  champagneSoft: '#E9D6A8',
  bordeaux: '#7A1028',
  bordeauxDeep: '#4A0A18',
  bordeauxSoft: '#B5405C',
  leaf: '#2E6B4A',
} as const;

export const colors = {
  // ---- Semantic tokens (prefer these in new code) ----
  canvas: palette.cream,
  surface: palette.paper,
  surface2: palette.paperWarm,
  text: palette.ink,
  textSoft: palette.inkSoft,
  textInverse: palette.paper,
  muted: palette.slate,
  line: palette.rule,
  lineSoft: palette.ruleSoft,
  accent: palette.gold,
  accentSoft: palette.goldSoft,
  romance: palette.rose,
  success: palette.emerald,
  danger: palette.clay,

  // ---- Legacy aliases, remapped onto the new palette ----
  // `black` was never black: it is the page canvas.
  black: palette.cream,
  // Legacy screens use `plum`, `ivory` and `espresso` for foreground copy, so
  // all three must stay dark on light surfaces.
  plum: palette.ink,
  plumLight: '#E6DACB',
  ivory: palette.ink,
  espresso: palette.ink,
  purple: '#3A1420',
  purpleDeep: palette.inkDeep,
  purpleLight: '#7A4252',
  // `pink` and `wine` drive the primary buttons: deep maroon, not the alarm
  // red the app started with.
  pink: palette.maroon,
  pinkSoft: palette.maroonSoft,
  wine: palette.maroon,
  wineDeep: palette.maroonDeep,
  gold: palette.goldBright,
  blush: '#F8EDE2',
  blushSoft: '#F0DFCD',
  selectedSurface: '#F5E7D8',
  selectedBorder: palette.gold,
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

/**
 * A 1.2-ish scale with a deliberate jump between `title` and `display`:
 * personality comes from that contrast rather than from a second typeface.
 */
export const typeScale = {
  display: 34,
  title: 24,
  section: 18,
  body: 15,
  label: 13,
  caption: 11.5,
};

export const font = {
  regular: 'Mukta_400Regular',
  medium: 'Mukta_500Medium',
  semibold: 'Mukta_600SemiBold',
  bold: 'Mukta_700Bold',
} as const;
