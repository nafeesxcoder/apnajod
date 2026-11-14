import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { fonts } from "../../../theme";
import { STORY_FONTS, TEXT_PAD } from "./fonts";
import { COLORS, FONT_LABELS, type FontKey, LINE_HEIGHT, type TextBg, type TextItem, textColors } from "./model";
import { keyboardBehavior } from "../../../layout/keyboardBehavior";

export type TextDraft = Pick<TextItem, "text" | "font" | "color" | "bg">;

const BG_ORDER: TextBg[] = ["none", "solid", "soft"];

/** Writing (or changing) a text on the story: font, colour and a box behind it. */
export function TextComposer({
  initial,
  size,
  onDone,
  dim = true,
}: {
  initial: TextDraft | null;
  /** Font size in pixels, the same as on the story. */
  size: number;
  /** Darken what is behind while typing (a photo). A text story keeps its colour. */
  dim?: boolean;
  onDone: (draft: TextDraft) => void;
}) {
  const [draft, setDraft] = useState<TextDraft>(initial ?? { text: "", font: "classic", color: "#FFFFFF", bg: "none" });
  useEffect(() => {
    setDraft(initial ?? { text: "", font: "classic", color: "#FFFFFF", bg: "none" });
  }, [initial]);
  // autoFocus can miss while the editor is still fading in (a text story
  // opens straight into typing): focus again a moment later.
  const input = useRef<TextInput>(null);
  useEffect(() => {
    const timer = setTimeout(() => input.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);
  // The box grows with what you type (a long quote shows whole, not scrolled).
  const [height, setHeight] = useState(0);
  const { text, box } = textColors(draft);
  const font = STORY_FONTS[draft.font];

  return (
    <KeyboardAvoidingView
      behavior={keyboardBehavior}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: dim ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.12)" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingTop: 12, gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Text background"
          onPress={() => setDraft((d) => ({ ...d, bg: BG_ORDER[(BG_ORDER.indexOf(d.bg) + 1) % BG_ORDER.length]! }))}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: "#FFFFFF",
              backgroundColor: draft.bg === "solid" ? "#FFFFFF" : draft.bg === "soft" ? "rgba(255,255,255,0.35)" : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: draft.bg === "solid" ? "#000" : "#FFF" }}>A</Text>
          </View>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }} style={{ flex: 1 }}>
          {(Object.keys(FONT_LABELS) as FontKey[]).map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`Font ${FONT_LABELS[key]}`}
              accessibilityState={{ selected: draft.font === key }}
              onPress={() => setDraft((d) => ({ ...d, font: key }))}
              style={{
                paddingHorizontal: 14,
                height: 34,
                borderRadius: 17,
                justifyContent: "center",
                backgroundColor: draft.font === key ? "#FFFFFF" : "rgba(255,255,255,0.15)",
              }}
            >
              <Text style={{ fontFamily: STORY_FONTS[key].family, fontSize: 14, color: draft.font === key ? "#000" : "#FFF" }}>
                {FONT_LABELS[key]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => onDone(draft)}
          style={{ paddingHorizontal: 12, height: 44, justifyContent: "center" }}
        >
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: "#FFFFFF" }}>Done</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
        <View style={{ backgroundColor: box ?? "transparent", borderRadius: TEXT_PAD.radius * size, paddingHorizontal: TEXT_PAD.x * size, maxWidth: "100%" }}>
          <TextInput
            ref={input}
            autoFocus
            multiline
            value={draft.text}
            onChangeText={(value) => setDraft((d) => ({ ...d, text: value }))}
            onContentSizeChange={(e) => setHeight(e.nativeEvent.contentSize.height)}
            placeholder="Type something..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            accessibilityLabel="Story text"
            autoCapitalize={font.upper ? "characters" : "sentences"}
            style={{
              fontFamily: font.family,
              fontSize: size,
              lineHeight: size * LINE_HEIGHT,
              height: Math.max(size * LINE_HEIGHT, height),
              color: text,
              textAlign: "center",
              minWidth: 60,
              ...(Platform.OS === "web" ? ({ outlineStyle: "none", textTransform: font.upper ? "uppercase" : "none" } as object) : null),
            }}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 14, paddingVertical: 14 }} style={{ flexGrow: 0 }}>
        {COLORS.map((color) => (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={`Colour ${color}`}
            onPress={() => setDraft((d) => ({ ...d, color }))}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: color,
              borderWidth: draft.color === color ? 3 : 2,
              borderColor: draft.color === color ? "#FFFFFF" : "rgba(255,255,255,0.6)",
            }}
          />
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
