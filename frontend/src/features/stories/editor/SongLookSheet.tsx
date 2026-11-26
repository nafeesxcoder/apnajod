import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fonts, palette } from "../../../theme";
import { Sheet } from "../../posts/PostSheets";
import { MusicSticker, type StickerMusic } from "../MusicSticker";
import type { LyricFont } from "../music/lyrics";
import type { SongLook } from "./model";

type Option = { key: "card" | "pill" | "lyrics" | "none"; label: string; detail: string; look: SongLook | null };

/**
 * The song's look on the story: a card, a small pill, the words, or no title
 * at all (the song still plays). Each one is drawn the way it will look.
 */
export function SongLookSheet({
  visible,
  onClose,
  onPick,
  music,
  current,
  width,
}: {
  visible: boolean;
  onClose: () => void;
  /** null picks no title. */
  onPick: (look: SongLook | null) => void;
  music: StickerMusic | null;
  /** The look now, or null when the song has no title. */
  current: SongLook | null;
  /** The story's width on this screen; the previews are drawn in proportion to it. */
  width: number;
}) {
  const hasWords = !!music?.lyrics?.length;
  const wordsFont: LyricFont = (current?.style === "lyrics" && current.lyricFont) || "classic";
  const previewWidth = Math.max(160, Math.min(260, width - 120));
  const selected = current ? current.style : "none";

  const options: Option[] = [
    { key: "card", label: "Card", detail: "Cover, title and artist", look: { style: "card" } },
    { key: "pill", label: "Small", detail: "A small pill with the title", look: { style: "pill" } },
    {
      key: "lyrics",
      label: "Lyrics",
      detail: hasWords ? "The words as the song plays" : "This part of the song has no words",
      look: { style: "lyrics", lyricFont: wordsFont },
    },
    { key: "none", label: "No title", detail: "The song plays, and nothing is shown", look: null },
  ];

  const previewOf = (option: Option) => {
    if (!option.look) {
      return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="eye-off-outline" size={18} color={palette.slate} />
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.slate }}>Nothing shown on the story</Text>
        </View>
      );
    }
    if (!music) return null;
    return (
      <MusicSticker
        music={music}
        style={option.look.style}
        lyricFont={option.look.lyricFont}
        width={previewWidth}
        // The words preview from the first line of the clip.
        time={music.lyrics?.[0]?.at ?? 0}
        playing={false}
      />
    );
  };

  return (
    <Sheet visible={visible} title="Song look" tall onClose={onClose}>
      <View style={{ padding: 14, gap: 10 }}>
        {options.map((option) => {
          const isSelected = option.key === selected;
          const unavailable = option.key === "lyrics" && !hasWords;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityLabel={`Song look: ${option.label}`}
              accessibilityState={{ selected: isSelected, disabled: unavailable }}
              disabled={unavailable}
              onPress={() => onPick(option.look)}
              style={{
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: isSelected ? palette.crimson : palette.rule,
                backgroundColor: isSelected ? palette.crimsonTint : "#FFFFFF",
                padding: 12,
                gap: 10,
                opacity: unavailable ? 0.5 : 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.ink }}>{option.label}</Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>{option.detail}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color={palette.crimson} />}
              </View>
              <View
                style={{
                  minHeight: 96,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  backgroundColor: palette.paperBase,
                  padding: 8,
                }}
              >
                {unavailable ? null : previewOf(option)}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
