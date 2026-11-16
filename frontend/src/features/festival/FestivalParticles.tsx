/**
 * Sparks, stars, snow or gulal falling down the screen for a few seconds -
 * once a day per festival, never for people who turned motion down, and
 * never in the way of a tap.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Text, View, useWindowDimensions } from "react-native";

import type { FestivalTheme } from "./themes";
import { particlesKey } from "./themes";

const COUNT = 34;

/** Big fireworks across the screen, one after another (Diwali, New Year). */
function ScreenFireworks({ theme, width, height }: { theme: FestivalTheme; width: number; height: number }) {
  const [shots, setShots] = useState<{ id: number; x: number; y: number }[]>([]);
  useEffect(() => {
    let id = 0;
    const timer = setInterval(() => {
      id += 1;
      if (id > 7) return clearInterval(timer);
      setShots((list) => [...list, { id, x: 40 + Math.random() * Math.max(width - 80, 40), y: 80 + Math.random() * height * 0.45 }]);
    }, 380);
    return () => clearInterval(timer);
  }, [width, height]);
  return (
    <>
      {shots.map((shot) => (
        <BigFirework key={shot.id} x={shot.x} y={shot.y} colors={theme.sparks} />
      ))}
    </>
  );
}

function BigFirework({ x, y, colors }: { x: number; y: number; colors: string[] }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  const sparks = 16;
  return (
    <View style={{ position: "absolute", left: x, top: y }}>
      {Array.from({ length: sparks }, (_, i) => {
        const angle = (i / sparks) * Math.PI * 2;
        const distance = 70 + (i % 2) * 25;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: colors[i % colors.length],
              opacity: v.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 1, 0.9, 0] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance + 30] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
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
      {theme.show === "fireworks" && <ScreenFireworks theme={theme} width={width} height={height} />}
      {bits.map((bit, i) => (
        <Falling
          key={i}
          bit={bit}
          height={height}
          rise={theme.show === "rise"}
          onDone={i === 0 ? () => setTimeout(() => setShow(false), 2000) : undefined}
        />
      ))}
    </View>
  );
}

function Falling({
  bit,
  height,
  onDone,
  rise,
}: {
  /** Hearts float up instead of falling. */
  rise?: boolean;
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
      easing: rise ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    anim.start(() => onDone?.());
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: rise ? [height, height * 0.05] : [-40, height * 0.85] });
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
