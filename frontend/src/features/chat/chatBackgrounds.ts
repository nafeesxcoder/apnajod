/**
 * The chat backgrounds: eight soft colour gradients, each with a mood. The
 * messages stay easy to read on all of them. A chat stores one id
 * (`background`). "classic" (the plain cream) and any unknown id show none.
 */
export type ChatBackground = {
  id: string;
  name: string;
  /** The gradient, from the top colour to the bottom one. */
  colors: [string, string];
};

const theme = (id: string, name: string, colors: [string, string]): ChatBackground => ({
  id,
  name,
  colors,
});

export const CHAT_BACKGROUNDS: ChatBackground[] = [
  theme("romantic", "Romantic", ["#FFE4EC", "#F7A8C0"]),
  theme("beautiful", "Beautiful", ["#FFF5F8", "#FBC8DA"]),
  theme("emotional", "Emotional", ["#EBDDF0", "#B98FC4"]),
  theme("sad", "Sad", ["#DCE4EE", "#8FA3B8"]),
  theme("nature", "Nature", ["#EAF6EC", "#A5D6A7"]),
  theme("calm", "Calm", ["#E2F6F7", "#8ACFCB"]),
  theme("sunset", "Sunset", ["#FFE7D6", "#FFA985"]),
  theme("night", "Night", ["#E7EAF6", "#AEB7DE"]),
];

/** The plain option: no background, just the cream. */
export const PLAIN_BACKGROUND_ID = "classic";

/** What the settings sheet offers: the plain option first, then the eight. */
export const BACKGROUND_CHOICES: ChatBackground[] = [
  { id: PLAIN_BACKGROUND_ID, name: "Plain cream", colors: ["#FDF7F4", "#F4E9E4"] },
  ...CHAT_BACKGROUNDS,
];

/** The background for a chat's id, or null for the plain option and for unknown ids. */
export function backgroundFor(id: string | undefined): ChatBackground | null {
  return CHAT_BACKGROUNDS.find((background) => background.id === id) ?? null;
}
