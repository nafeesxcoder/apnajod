/**
 * The chat backgrounds: soft two-colour gradients, with no pictures on them, so
 * the messages stay easy to read. A chat stores one id (`background`).
 * "classic" (the plain cream) and any unknown id show no background.
 */
export type ChatBackground = {
  id: string;
  name: string;
  colors: [string, string];
};

const theme = (id: string, name: string, colors: [string, string]): ChatBackground => ({
  id,
  name,
  colors,
});

export const CHAT_BACKGROUNDS: ChatBackground[] = [
  theme("blush", "Blush", ["#FFF1F4", "#FFD6E0"]),
  theme("lavender", "Lavender", ["#F5F0FF", "#DCCFFA"]),
  theme("peach", "Peach", ["#FFF3EA", "#FFC9A8"]),
  theme("ocean", "Ocean", ["#EAF6FF", "#A8D8F5"]),
  theme("mint", "Mint", ["#EDFFF7", "#B5ECD3"]),
  theme("golden-hour", "Golden hour", ["#FFF8E6", "#F8D98C"]),
  theme("sage", "Sage", ["#F1F5EE", "#CFDCC4"]),
  theme("rose", "Rose", ["#FFF5F5", "#F5C2C7"]),
];

/** The plain option: no background, just the cream. */
export const PLAIN_BACKGROUND_ID = "classic";

/** What the settings sheet offers: the plain option first, then the eight. */
export const BACKGROUND_CHOICES: { id: string; name: string; colors: [string, string] }[] = [
  { id: PLAIN_BACKGROUND_ID, name: "Plain cream", colors: ["#FDF7F4", "#F4E9E4"] },
  ...CHAT_BACKGROUNDS,
];

/** The background for a chat's id, or null for the plain option and for unknown ids. */
export function backgroundFor(id: string | undefined): ChatBackground | null {
  return CHAT_BACKGROUNDS.find((background) => background.id === id) ?? null;
}
