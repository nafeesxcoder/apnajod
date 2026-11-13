import { Pressable, Text, View } from "react-native";

import { fonts, palette } from "../../../theme";
import { Sheet } from "../../posts/PostSheets";
import { dateSticker, timeSticker } from "./model";

export const EMOJIS = [
  "❤️", "😍", "🥰", "😘", "😂", "🤣", "😊", "😎", "🥳", "🤩",
  "😇", "🙈", "😢", "😡", "🤔", "😴", "🔥", "✨", "💯", "🎉",
  "💖", "💕", "💔", "🌹", "🌸", "🌙", "☀️", "🌈", "⭐", "🎶",
  "☕", "🍕", "🎂", "🍫", "✈️", "🏖️", "📸", "💍", "👑", "🙏",
];

/** Stickers: the time, the date, and emoji. */
export function StickerSheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (kind: "emoji" | "time" | "date", value: string) => void;
}) {
  const pill = (kind: "time" | "date", value: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={kind === "time" ? `Time sticker ${value}` : `Date sticker ${value}`}
      onPress={() => onPick(kind, value)}
      style={{ paddingHorizontal: 18, height: 42, borderRadius: 21, borderWidth: 1, borderColor: palette.rule, justifyContent: "center" }}
    >
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: palette.ink }}>{value}</Text>
    </Pressable>
  );
  return (
    <Sheet visible={visible} title="Stickers" onClose={onClose}>
      <View style={{ padding: 14, gap: 14 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {pill("time", timeSticker())}
          {pill("date", dateSticker())}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 6 }}>
          {EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              accessibilityRole="button"
              accessibilityLabel={`Emoji ${emoji}`}
              onPress={() => onPick("emoji", emoji)}
              style={{ width: "10%", minWidth: 34, aspectRatio: 1, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 28 }}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Sheet>
  );
}
