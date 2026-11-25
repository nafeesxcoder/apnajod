import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { backgroundFor } from "./chatBackgrounds";

/**
 * The background behind a chat's messages: a photo for a photo theme, otherwise
 * a soft gradient. It stays still, and it never takes a tap.
 */
export function ChatBackdrop({ background }: { background?: string }) {
  const chosen = backgroundFor(background);
  if (!chosen) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {chosen.image ? (
        <Image source={chosen.image} resizeMode="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <LinearGradient
          colors={chosen.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}
