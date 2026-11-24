import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { backgroundFor, type ChatBackground } from "./chatBackgrounds";

const PARTICLES = 9;

/**
 * The picture behind a chat's messages: a soft gradient, and for some
 * backgrounds a few shapes that float slowly upward. It never takes a tap.
 */
export function ChatBackdrop({ background }: { background?: string }) {
  const chosen = backgroundFor(background);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={chosen.colors} style={StyleSheet.absoluteFill} />
      {chosen.glyph ? <Particles key={chosen.id} background={chosen} /> : null}
    </View>
  );
}

function Particles({ background }: { background: ChatBackground }) {
  const { height } = useWindowDimensions();
  const drift = useRef(
    Array.from({ length: PARTICLES }, () => new Animated.Value(0)),
  ).current;

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
    loops.forEach((loop, index) => setTimeout(() => loop.start(), index * 400));
    return () => loops.forEach((loop) => loop.stop());
  }, [drift]);

  return (
    <>
      {drift.map((value, index) => (
        <Animated.Text
          key={index}
          style={{
            position: "absolute",
            left: `${(index * 37 + 9) % 92}%`,
            fontSize: 18 + (index % 3) * 8,
            color: background.glyph?.color,
            opacity: value.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.55, 0.55, 0] }),
            transform: [
              {
                translateY: value.interpolate({ inputRange: [0, 1], outputRange: [height * 0.25, -60] }),
              },
            ],
          }}
        >
          {background.glyph?.char}
        </Animated.Text>
      ))}
    </>
  );
}
