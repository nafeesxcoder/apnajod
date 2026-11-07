export const fonts = {
  display: 'Marcellus_400Regular',
  body: 'Mukta_400Regular',
  bodyMedium: 'Mukta_500Medium',
  bodySemi: 'Mukta_600SemiBold',
  bodyBold: 'Mukta_700Bold',
};

export const palette = {
  paperBase: '#FDF7F4',
  paper: '#FFFFFF',
  paperCool: '#FFFBF9',
  paperSand: '#F6EBE3',

  ink: '#14202E',
  inkDeep: '#0A1420',
  inkSoft: '#33414F',
  slate: '#5A6878',

  navy: '#1F4D7A',
  navyDeep: '#12355A',
  navySoft: '#7C9CBC',

  crimson: '#A8243A',
  crimsonDeep: '#7A1628',
  crimsonSoft: '#D8A3AC',
  crimsonTint: '#F7E3E7',

  marigold: '#E0923A',
  marigoldTint: '#FBEEDC',

  emerald: '#1F7A5A',
  clay: '#B3261E',
  tickRead: '#53BDEB',

  rule: '#EADDD2',
  ruleSoft: '#F3E8E0',

  cream: '#FDF7F4',
  paperWarm: '#FFFBF9',
  limewash: '#FDF7F4',
  pearl: '#FDF7F4',
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
  blushSoft: '#F0D2D8',
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