/**
 * Apnajoda — "Navy & Crimson", taken from the mark.
 *
 * The logo is a navy A and a crimson J tied together on near-white paper, so
 * the app is built from the same three things and nothing else:
 *
 *   paper      a cool near-white canvas, not the old warm cream
 *   navy       every primary action, and the type
 *   crimson    the one accent — the red half of the mark
 *
 * Navy carries the work and crimson is rationed, exactly as in the wordmark
 * where only "joda" is red. Crimson marks the romantic register (a like, a
 * match, a heart) and the single accent on a screen; if two things on one
 * screen are crimson, one of them is wrong.
 *
 * Each colour has a dark and a soft member of the same ramp. `navy` and
 * `crimson` are dark enough to pass WCAG AA as text on paper (8.1:1 and
 * 6.5:1); the `*Soft` members are tints for fills and borders, never for
 * text. Danger is deliberately an orange-leaning red so it does not read as
 * the brand crimson next to it.
 *
 * The legacy token names (maroon, gold, plum, pink, wine, ivory, cream, …)
 * are kept because the screens reference them by the hundred. They now point
 * at this palette: `maroon` is navy, `gold` is crimson, `cream` is paper. The
 * names lie about their hue and tell the truth about their role, which is the
 * cheaper of the two problems to live with.
 */

// ---- The palette, named for what it is ----
export const palette = {
  // Paper
  paperBase: '#F5F6F8', // the canvas, a cool near-white
  paper: '#FFFFFF', // raised cards and fields
  paperCool: '#FBFCFD', // a half-step above the canvas

  // Type
  ink: '#14202E', // navy-black — primary type
  inkDeep: '#0A1420', // pressed states, deep panels
  inkSoft: '#33414F', // ink at reading weight
  slate: '#5A6878', // secondary text, 5.3:1 on paper

  // Navy — every primary action
  navy: '#1F4D7A',
  navyDeep: '#12355A', // pressed
  navySoft: '#7C9CBC', // tint strength, fills and borders only

  // Crimson — the one accent, the red in the mark
  crimson: '#A8243A',
  crimsonDeep: '#7A1628',
  crimsonSoft: '#D8A3AC',
  crimsonTint: '#F7E3E7', // a wash behind a liked card

  // Status
  emerald: '#1F7A5A', // verified, success
  clay: '#B3261E', // errors only — orange-leaning, not the brand red
  // The read tick, and the only light blue in the app. It has to read as
  // blue against the navy bubble it sits on (#174069), so the navy tokens
  // above are all too dark for it: a tick in those is invisible, which is
  // exactly how the ticks shipped - the read state was a mid grey, dimmer
  // than the unread white tick beside it, on a screen whose own label says
  // "blue ticks".
  tickRead: '#53BDEB',

  // Lines
  rule: '#DDE3EA', // hairline on paper
  ruleSoft: '#EDF1F5',

  // ---- Legacy member names, repointed. Screens import these directly. ----
  cream: '#F5F6F8',
  paperWarm: '#FBFCFD',
  limewash: '#F5F6F8',
  pearl: '#F5F6F8',
  indigo: '#14202E',
  indigoDeep: '#0A1420',
  indigoSoft: '#33414F',
  maroon: '#1F4D7A',
  maroonDeep: '#12355A',
  maroonSoft: '#7C9CBC',
  gold: '#A8243A',
  goldBright: '#C13552',
  goldSoft: '#D8A3AC',
  brass: '#A8243A',
  brassSoft: '#D8A3AC',
  champagne: '#A8243A',
  champagneBright: '#C13552',
  champagneSoft: '#D8A3AC',
  bordeaux: '#1F4D7A',
  bordeauxDeep: '#12355A',
  bordeauxSoft: '#7C9CBC',
  rose: '#A8243A',
  roseSoft: '#D8A3AC',
  leaf: '#1F7A5A',
} as const;

export const colors = {
  // ---- Semantic tokens (prefer these in new code) ----
  canvas: palette.paperBase,
  surface: palette.paper,
  surface2: palette.paperCool,
  text: palette.ink,
  textSoft: palette.inkSoft,
  textInverse: palette.paper,
  muted: palette.slate,
  line: palette.rule,
  lineSoft: palette.ruleSoft,
  primary: palette.navy,
  primaryDeep: palette.navyDeep,
  primarySoft: palette.navySoft,
  accent: palette.crimson,
  accentSoft: palette.crimsonSoft,
  romance: palette.crimson,
  success: palette.emerald,
  danger: palette.clay,

  // ---- Legacy aliases, remapped onto the new palette ----
  // `black` was never black: it is the page canvas.
  black: palette.paperBase,
  // Legacy screens use `plum`, `ivory` and `espresso` for foreground copy, so
  // all three must stay dark on light surfaces.
  plum: palette.ink,
  plumLight: '#C9D2DC',
  ivory: palette.ink,
  espresso: palette.ink,
  purple: '#17283A',
  purpleDeep: palette.inkDeep,
  purpleLight: '#425870',
  // `pink` and `wine` drive the primary buttons: navy, not a red.
  pink: palette.navy,
  pinkSoft: palette.navySoft,
  wine: palette.navy,
  wineDeep: palette.navyDeep,
  gold: palette.goldBright,
  blush: palette.crimsonTint,
  blushSoft: '#F0D2D8',
  selectedSurface: '#E6EDF5',
  selectedBorder: palette.navy,
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
