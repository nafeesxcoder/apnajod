export const fonts = {
  display: 'Marcellus_400Regular',
  body: 'Mukta_400Regular',
  bodyMedium: 'Mukta_500Medium',
  bodySemi: 'Mukta_600SemiBold',
  bodyBold: 'Mukta_700Bold',
};

export const palette = {
  paperBase: '#FBF4FF',
  paper: '#FFFFFF',
  paperCool: '#FFF8FC',
  paperSand: '#F3E8FF',

  ink: '#14102E',
  inkDeep: '#0A0716',
  inkSoft: '#3A3358',
  slate: '#5B5478',

  navy: '#B0245F',
  navyDeep: '#8A1A47',
  navySoft: '#E8A1BE',

  crimson: '#D6336C',
  crimsonDeep: '#6E1437',
  crimsonSoft: '#F2B6CF',
  crimsonTint: '#FBE3EE',

  marigold: '#E0923A',
  marigoldTint: '#FBEEDC',

  emerald: '#1F7A5A',
  clay: '#B3261E',
  tickRead: '#53BDEB',

  rule: '#E7D8EE',
  ruleSoft: '#F3EBF8',

  cream: '#FBF4FF',
  paperWarm: '#FFF8FC',
  limewash: '#FBF4FF',
  pearl: '#FBF4FF',
  indigo: '#14102E',
  indigoDeep: '#0A0716',
  indigoSoft: '#3A3358',
  maroon: '#B0245F',
  maroonDeep: '#8A1A47',
  maroonSoft: '#E8A1BE',
  gold: '#D6336C',
  goldBright: '#E0457B',
  goldSoft: '#F2B6CF',
  brass: '#D6336C',
  brassSoft: '#F2B6CF',
  champagne: '#D6336C',
  champagneBright: '#E0457B',
  champagneSoft: '#F2B6CF',
  bordeaux: '#B0245F',
  bordeauxDeep: '#8A1A47',
  bordeauxSoft: '#E8A1BE',
  rose: '#D6336C',
  roseSoft: '#F2B6CF',
  leaf: '#1F7A5A',
} as const;

export const colors = {
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

  black: palette.paperBase,
  plum: palette.ink,
  plumLight: '#C9D2DC',
  ivory: palette.ink,
  espresso: palette.ink,
  purple: '#17283A',
  purpleDeep: palette.inkDeep,
  purpleLight: '#425870',
  pink: palette.navy,
  pinkSoft: palette.navySoft,
  wine: palette.navy,
  wineDeep: palette.navyDeep,
  gold: palette.goldBright,
  blush: palette.crimsonTint,
  blushSoft: '#F4D2E2',
  selectedSurface: '#E6EDF5',
  selectedBorder: palette.navy,
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

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