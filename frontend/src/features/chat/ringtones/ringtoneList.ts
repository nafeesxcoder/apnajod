/**
 * The call ringtones: twelve of our own (tunes written for Apnajoda and made
 * in code), or one you pick from your phone. Pure, so it can be tested.
 */
export const RINGTONES: { key: string; name: string }[] = [
  { key: "classic", name: "Classic Ring" },
  { key: "soft_bell", name: "Soft Bell" },
  { key: "marimba", name: "Marimba Morning" },
  { key: "sitar", name: "Sitar Touch" },
  { key: "bansuri", name: "Bansuri" },
  { key: "piano", name: "Piano Light" },
  { key: "digital", name: "Digital" },
  { key: "chime", name: "Chime Cascade" },
  { key: "romantic", name: "Romantic" },
  { key: "retro", name: "Retro Phone" },
  { key: "tabla", name: "Tabla Beat" },
  { key: "calm", name: "Calm Waves" },
];

export const DEFAULT_RINGTONE = "soft_bell";
/** Your own ringtone from your phone: at most this big. */
export const MAX_CUSTOM_BYTES = 2 * 1024 * 1024;

/** A saved choice, checked: a known ringtone, "custom" when there is one, else the default. */
export function cleanRingtone(key: unknown, hasCustom: boolean): string {
  if (key === "custom") return hasCustom ? "custom" : DEFAULT_RINGTONE;
  return typeof key === "string" && RINGTONES.some((r) => r.key === key) ? key : DEFAULT_RINGTONE;
}

/** "Soft Bell", or the file name for your own. */
export function ringtoneName(key: string, customName?: string | null): string {
  if (key === "custom") return customName ? customName.replace(/\.[^.]+$/, "") : "My ringtone";
  return RINGTONES.find((r) => r.key === key)?.name ?? "Soft Bell";
}
