/**
 * The festival on Home: a live banner under the greeting while the admin
 * has a theme on - "Happy Diwali, Aarav!" over a little moving scene
 * (diyas flickering, fireworks, lanterns, gulal, snow, hearts...) - and a
 * button to post a festive story. Tap anywhere on it for a burst.
 *
 * People who turned motion down get the calm version: the same colours
 * and words, with a still row of decoration.
 */
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, Pressable, Text, Vibration, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { fonts, radius } from "../../theme";
import { PressScale } from "../../components/motion";
import type { FestivalTheme } from "./themes";
import { greetingLine } from "./themes";
import { FestivalScene, TapBurst } from "./FestivalScene";

/** A tiny buzz on a tap, where the phone allows it. */
function buzz() {
  try {
    if (Platform.OS === "android") Vibration.vibrate(12);
    else if (Platform.OS === "web" && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
  } catch {
    // No buzz is fine.
  }
}

export function FestivalBanner({
  theme,
  name,
  onStory,
}: {
  theme: FestivalTheme;
  name: string;
  onStory?: () => void;
}) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [calm, setCalm] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextId = useRef(0);
  const frame = useRef<View | null>(null);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(setCalm)
      .catch(() => undefined);
  }, []);

  const burst = (x: number, y: number) => {
    if (calm) return;
    buzz();
    nextId.current += 1;
    const id = nextId.current;
    setBursts((list) => [...list.slice(-2), { id, x, y }]);
    setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), 1000);
  };

  return (
    <Pressable
      accessibilityLabel={`${theme.name} greeting`}
      accessibilityHint="Tap for a festive burst"
      onPress={(event) => {
        // Where on the banner: the tap on the screen, less where the banner is.
        const { pageX, pageY } = event.nativeEvent;
        if (frame.current) frame.current.measureInWindow((x, y) => burst(pageX - x, pageY - y));
        else burst(box.width / 2, box.height / 2);
      }}
      style={{ marginBottom: 16 }}
    >
      <View ref={frame} collapsable={false}>
      <LinearGradient
        colors={theme.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        onLayout={(event) => setBox({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
        style={{
          borderRadius: 22,
          paddingHorizontal: 18,
          paddingTop: calm ? 16 : 34,
          paddingBottom: calm ? 16 : 40,
          minHeight: calm ? 0 : 196,
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {!calm && <FestivalScene theme={theme} box={box} />}
        {calm && (
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            numberOfLines={1}
            style={{ fontSize: 18, letterSpacing: 2, textAlign: "center", opacity: 0.95, marginBottom: 10 }}
          >
            {theme.ornament}
          </Text>
        )}
        <Text
          style={{
            textAlign: "center",
            fontFamily: fonts.display,
            fontSize: 24,
            lineHeight: 30,
            color: theme.ink,
            textShadowColor: "rgba(0,0,0,0.25)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 6,
          }}
        >
          {greetingLine(theme.greeting, name)}
        </Text>
        <Text
          style={{
            marginTop: 4,
            textAlign: "center",
            fontFamily: fonts.body,
            fontSize: 13,
            color: theme.ink,
            opacity: 0.9,
          }}
        >
          Wish your matches with a {theme.name} story
        </Text>
        {onStory && (
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={`Post a ${theme.name} story`}
            onPress={onStory}
            containerStyle={{ alignSelf: "center", marginTop: 12 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(255,255,255,0.2)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.5)",
              borderRadius: radius.pill,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <Ionicons name="add-circle-outline" size={16} color={theme.ink} />
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: theme.ink }}>
              Post a {theme.name} story
            </Text>
          </PressScale>
        )}
        {bursts.map((b) => (
          <TapBurst key={b.id} x={b.x} y={b.y} theme={theme} />
        ))}
      </LinearGradient>
      </View>
    </Pressable>
  );
}
