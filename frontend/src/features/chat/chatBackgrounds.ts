import type { ImageSourcePropType } from "react-native";

import roseHands from "../../../assets/chat-themes/rose-hands.jpg";
import skyHands from "../../../assets/chat-themes/sky-hands.jpg";
import lilacSky from "../../../assets/chat-themes/lilac-sky.jpg";
import greyHearts from "../../../assets/chat-themes/grey-hearts.jpg";
import littleLove from "../../../assets/chat-themes/little-love.jpg";

/**
 * The chat backgrounds: soft colour gradients, and a few photo themes. The
 * messages stay easy to read on all of them. A chat stores one id
 * (`background`). "classic" (the plain cream) and any unknown id show none.
 */
export type ChatBackground = {
  id: string;
  name: string;
  /** The gradient, or the colour shown while a photo theme loads. */
  colors: [string, string];
  /** The picture behind the messages, for a photo theme. */
  image?: ImageSourcePropType;
};

const theme = (id: string, name: string, colors: [string, string]): ChatBackground => ({
  id,
  name,
  colors,
});

const photoTheme = (
  id: string,
  name: string,
  colors: [string, string],
  image: ImageSourcePropType,
): ChatBackground => ({ id, name, colors, image });

export const CHAT_BACKGROUNDS: ChatBackground[] = [
  theme("blush", "Blush", ["#FFF1F4", "#FFD6E0"]),
  theme("lavender", "Lavender", ["#F5F0FF", "#DCCFFA"]),
  theme("peach", "Peach", ["#FFF3EA", "#FFC9A8"]),
  theme("ocean", "Ocean", ["#EAF6FF", "#A8D8F5"]),
  theme("mint", "Mint", ["#EDFFF7", "#B5ECD3"]),
  theme("golden-hour", "Golden hour", ["#FFF8E6", "#F8D98C"]),
  theme("sage", "Sage", ["#F1F5EE", "#CFDCC4"]),
  theme("rose", "Rose", ["#FFF5F5", "#F5C2C7"]),
  photoTheme("rose-hands", "Rose hands", ["#FBE6EC", "#EBD6E4"], roseHands),
  photoTheme("sky-hands", "Sky hands", ["#8D95A6", "#5F6778"], skyHands),
  photoTheme("lilac-sky", "Lilac sky", ["#A5A6CF", "#7A7FB0"], lilacSky),
  photoTheme("grey-hearts", "Grey hearts", ["#EDEDED", "#D6D6D6"], greyHearts),
  photoTheme("little-love", "Little love", ["#F3F3F3", "#E0E0E0"], littleLove),
];

/** The plain option: no background, just the cream. */
export const PLAIN_BACKGROUND_ID = "classic";

/** What the settings sheet offers: the plain option first, then the themes. */
export const BACKGROUND_CHOICES: ChatBackground[] = [
  { id: PLAIN_BACKGROUND_ID, name: "Plain cream", colors: ["#FDF7F4", "#F4E9E4"] },
  ...CHAT_BACKGROUNDS,
];

/** The background for a chat's id, or null for the plain option and for unknown ids. */
export function backgroundFor(id: string | undefined): ChatBackground | null {
  return CHAT_BACKGROUNDS.find((background) => background.id === id) ?? null;
}
