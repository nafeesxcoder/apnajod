import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { backgroundFor, type ChatBackground } from "./chatBackgrounds";

const ROW_HEIGHT = 56;
const CELL = 58;

/**
 * The picture behind a chat's messages: a soft colour and the background's
 * pattern repeated down the screen. It stays still, and never takes a tap.
 */
export function ChatBackdrop({ background }: { background?: string }) {
  const chosen = backgroundFor(background);
  if (!chosen) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={chosen.colors} style={StyleSheet.absoluteFill} />
      <Pattern background={chosen} />
    </View>
  );
}

/** The pattern: one line of glyphs per row, every other row offset, so it reads as a wallpaper. */
function Pattern({ background }: { background: ChatBackground }) {
  const { width, height } = useWindowDimensions();
  const cols = Math.ceil(width / CELL) + 1;
  const rows = Math.ceil(height / ROW_HEIGHT) + 1;
  const line = `${background.pattern.glyph}`.repeat(cols);
  return (
    <View style={StyleSheet.absoluteFill}>
      {Array.from({ length: rows }, (_, row) => (
        <Text
          key={row}
          numberOfLines={1}
          style={{
            position: "absolute",
            top: row * ROW_HEIGHT,
            left: row % 2 === 0 ? -6 : -CELL / 2 - 6,
            width: width + CELL * 2,
            fontSize: 26,
            letterSpacing: CELL - 26,
            color: background.pattern.color,
            opacity: background.pattern.opacity,
          }}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}
