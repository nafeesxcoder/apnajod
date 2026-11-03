export type Country = { code: string; name: string; dial: string; flag: string };

// India-only product. The list stays as an array so the UI code that maps over
// it keeps working if another market is ever added.
export const COUNTRIES: Country[] = [
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
];

export const DEFAULT_COUNTRY: Country = COUNTRIES[0]!;

/** True while the product ships to a single market, so the UI can hide the picker. */
export const IS_SINGLE_COUNTRY = COUNTRIES.length === 1;
