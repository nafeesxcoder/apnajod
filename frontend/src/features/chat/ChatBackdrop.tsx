import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { backgroundFor, type ChatDecor } from "./chatBackgrounds";

/**
 * The background behind a chat's messages: a soft gradient with a few faint
 * shapes on it. It stays still, and it never takes a tap.
 */
export function ChatBackdrop({ background }: { background?: string }) {
  const chosen = backgroundFor(background);
  if (!chosen) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={chosen.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Decor decor={chosen.decor} />
    </View>
  );
}

/**
 * The few shapes scattered over the gradient. Their places are worked out from
 * their number, not random, so the picture looks the same every time it opens.
 */
function Decor({ decor }: { decor: ChatDecor }) {
  const { width, height } = useWindowDimensions();
  if (decor.count === 0) return null;
  return (
    <>
      {Array.from({ length: decor.count }, (_, index) => {
        const left = ((index * 37 + 11) % 91) + 3;
        const top = ((index * 53 + 7) % 89) + 4;
        const tilt = (index * 23) % 40 - 20;
        return (
          <Text
            key={index}
            style={{
              position: "absolute",
              left: (width * left) / 100,
              top: (height * top) / 100,
              fontSize: decor.size,
              color: decor.color,
              opacity: decor.opacity,
              transform: [{ rotate: `${tilt}deg` }],
            }}
          >
            {decor.glyph}
          </Text>
        );
      })}
    </>
  );
}
