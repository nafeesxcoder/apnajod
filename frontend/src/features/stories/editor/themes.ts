/**
 * Backgrounds for a text story (no photo), like Instagram's Create mode:
 * a colour or a gradient from top to bottom, with your words on it.
 */
export type TextTheme = { id: string; name: string; colors: [string, string] };

export const TEXT_THEMES: TextTheme[] = [
  { id: "apnajoda", name: "Apnajoda", colors: ["#A3293C", "#1F4D7A"] },
  { id: "sunset", name: "Sunset", colors: ["#FF5F6D", "#FFC371"] },
  { id: "ocean", name: "Ocean", colors: ["#2193B0", "#6DD5ED"] },
  { id: "royal", name: "Royal", colors: ["#4568DC", "#B06AB3"] },
  { id: "mint", name: "Mint", colors: ["#11998E", "#38EF7D"] },
  { id: "rose", name: "Rose", colors: ["#F857A6", "#FF5858"] },
  { id: "lavender", name: "Lavender", colors: ["#A18CD1", "#FBC2EB"] },
  { id: "mango", name: "Mango", colors: ["#F7971E", "#FFD200"] },
  { id: "night", name: "Night", colors: ["#0F2027", "#2C5364"] },
  { id: "black", name: "Black", colors: ["#111111", "#111111"] },
];

/** The next (or previous) background, going round. */
export function stepTheme(index: number, direction: 1 | -1): number {
  return (index + direction + TEXT_THEMES.length) % TEXT_THEMES.length;
}

/** A text story is a 1080 x 1920 picture made on the phone; there is no photo. */
export const TEXT_STORY = { uri: "", width: 1080, height: 1920, text: true } as const;

/**
 * On a text story the words start a little bigger. Text wraps at 86% of the
 * width before it is scaled, so this keeps a long quote inside the frame.
 */
export const TEXT_STORY_SCALE = 1.12;
