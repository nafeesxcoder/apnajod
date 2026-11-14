import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fonts, palette } from "../../../theme";
import { Sheet } from "../../posts/PostSheets";
import { dateSticker, timeSticker } from "./model";
import { festivalEmojis, type FestivalTheme } from "../../festival/themes";

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
  onLive,
  festival,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (kind: "emoji" | "time" | "date" | "greeting", value: string) => void;
  /** A festival theme on now puts its stickers first. */
  festival?: FestivalTheme | null;
  /** Poll, question box or @mention - each opens its own editor. */
  onLive: (kind: "poll" | "question" | "mention") => void;
}) {
  const live = (kind: "poll" | "question" | "mention", icon: "stats-chart" | "help-circle" | "at", label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} sticker`}
      onPress={() => onLive(kind)}
      style={{ flex: 1, minHeight: 64, borderRadius: 14, backgroundColor: palette.crimsonTint, alignItems: "center", justifyContent: "center", gap: 4 }}
    >
      <Ionicons name={icon} size={22} color={palette.crimson} />
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.crimson }}>{label}</Text>
    </Pressable>
  );
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
        {festival && (
          <View
            accessibilityLabel={`${festival.name} stickers`}
            style={{ backgroundColor: palette.crimsonTint, borderRadius: 16, padding: 12, gap: 10 }}
          >
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.crimson }}>{festival.name}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${festival.greeting} sticker`}
              onPress={() => onPick("greeting", `${festival.emoji} ${festival.greeting}`)}
              style={{ alignSelf: "flex-start", paddingHorizontal: 18, height: 42, borderRadius: 21, backgroundColor: "#FFFFFF", justifyContent: "center" }}
            >
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: palette.ink }}>
                {festival.emoji} {festival.greeting}
              </Text>
            </Pressable>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {festivalEmojis(festival).map((emoji) => (
                <Pressable
                  key={emoji}
                  accessibilityRole="button"
                  accessibilityLabel={`Emoji ${emoji}`}
                  onPress={() => onPick("emoji", emoji)}
                  style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {live("poll", "stats-chart", "Poll")}
          {live("question", "help-circle", "Question")}
          {live("mention", "at", "Mention")}
        </View>
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
