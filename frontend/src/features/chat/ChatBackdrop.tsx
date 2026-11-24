import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { backgroundFor, type ChatBackground } from "./chatBackgrounds";

const PARTICLES = 8;
const ROW_HEIGHT = 56;
const CELL = 58;

/**
 * The picture behind a chat's messages: a soft colour, the background's
 * pattern repeated down the screen, and a few shapes floating slowly up.
 * It never takes a tap, and the messages sit above it.
 */
export function ChatBackdrop({ background }: { background?: string }) {
  const chosen = backgroundFor(background);
  if (!chosen) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={chosen.colors} style={StyleSheet.absoluteFill} />
      <Pattern background={chosen} />
      <Particles key={chosen.id} background={chosen} />
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

function Particles({ background }: { background: ChatBackground }) {
  const { height } = useWindowDimensions();
  const drift = useRef(Array.from({ length: PARTICLES }, () => new Animated.Value(0))).current;

  useEffect(() => {
    // Each shape has its own speed, so they never move in step.
    const loops = drift.map((value, index) =>
      Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: 9000 + index * 1300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    );
    const timers = loops.map((loop, index) => setTimeout(() => loop.start(), index * 500));
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      loops.forEach((loop) => loop.stop());
    };
  }, [drift]);

  return (
    <>
      {drift.map((value, index) => (
        <Animated.Text
          key={index}
          style={{
            position: "absolute",
            left: `${(index * 37 + 9) % 90}%`,
            fontSize: 16 + (index % 3) * 8,
            color: background.float.color,
            opacity: value.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.8, 0.8, 0] }),
            transform: [
              {
                translateY: value.interpolate({ inputRange: [0, 1], outputRange: [height * 0.25, -60] }),
              },
            ],
          }}
        >
          {background.float.glyph}
        </Animated.Text>
      ))}
    </>
  );
}
