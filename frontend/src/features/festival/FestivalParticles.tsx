/**
 * Sparks, stars, snow or gulal falling down the screen for a few seconds -
 * once a day per festival, never for people who turned motion down, and
 * never in the way of a tap.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Text, View, useWindowDimensions } from "react-native";

import type { FestivalTheme } from "./themes";
import { particlesKey } from "./themes";

const COUNT = 18;
let shownThisRun = new Set<string>();

function alreadyShown(key: string) {
  if (shownThisRun.has(key)) return true;
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(key)) return true;
  } catch {
    // No storage: once per run is enough.
  }
  return false;
}

function remember(key: string) {
  shownThisRun.add(key);
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, "1");
  } catch {
    // Fine.
  }
}

export function FestivalParticles({ theme }: { theme: FestivalTheme }) {
  const { width, height } = useWindowDimensions();
  const [show, setShow] = useState(false);
  const key = particlesKey(theme.key);

  useEffect(() => {
    let live = true;
    if (alreadyShown(key)) return;
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduced) => {
        if (!live) return;
        remember(key);
        if (!reduced) setShow(true);
      });
    return () => {
      live = false;
    };
  }, [key]);

  const bits = useMemo(() => {
    const emoji = theme.particles.emoji ?? [];
    const dots = theme.particles.dots ?? [];
    return Array.from({ length: COUNT }, (_, i) => ({
      x: Math.random() * Math.max(width - 30, 30),
      delay: Math.random() * 700,
      duration: 2200 + Math.random() * 1300,
      drift: (Math.random() - 0.5) * 60,
      size: 14 + Math.random() * 12,
      emoji: emoji.length ? (emoji[i % emoji.length] ?? null) : null,
      dot: dots.length ? (dots[i % dots.length] ?? null) : null,
    }));
  }, [theme.key, width]);

  if (!show) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, overflow: "hidden" }}
    >
      {bits.map((bit, i) => (
        <Falling key={i} bit={bit} height={height} onDone={i === 0 ? () => setTimeout(() => setShow(false), 1500) : undefined} />
      ))}
    </View>
  );
}

function Falling({
  bit,
  height,
  onDone,
}: {
  bit: { x: number; delay: number; duration: number; drift: number; size: number; emoji: string | null; dot: string | null };
  height: number;
  onDone?: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: bit.duration,
      delay: bit.delay,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    anim.start(() => onDone?.());
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-40, height * 0.85] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, bit.drift] });
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.View style={{ position: "absolute", left: bit.x, top: 0, opacity, transform: [{ translateY }, { translateX }] }}>
      {bit.emoji ? (
        <Text style={{ fontSize: bit.size }}>{bit.emoji}</Text>
      ) : (
        <View style={{ width: bit.size * 0.6, height: bit.size * 0.6, borderRadius: bit.size, backgroundColor: bit.dot ?? "#F59E0B" }} />
      )}
    </Animated.View>
  );
}

/** For tests: forget what was shown this run. */
export function resetParticlesForTest() {
  shownThisRun = new Set();
}
