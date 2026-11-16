/**
 * What moves inside the festival banner on Home - a small live scene for
 * each festival, so the app feels like it is celebrating:
 *
 * - Diwali: diyas whose flames flicker, fireworks going off behind them
 * - Eid: a glowing moon, twinkling stars, lanterns swinging on their strings
 * - Holi: puffs of gulal bursting in every colour
 * - Christmas: snow falling and a string of lights blinking along the top
 * - New Year: fireworks and confetti
 * - Valentine's: hearts floating up past a beating heart
 * - Raksha Bandhan: a marigold garland swaying, petals drifting down
 *
 * Plus a shine that sweeps across, and a burst wherever the banner is
 * tapped. Everything sits behind the words and never takes a tap.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";

import type { FestivalTheme } from "./themes";

type Box = { width: number; height: number };

function useLoop(make: (value: Animated.Value) => Animated.CompositeAnimation, delay = 0) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(make(value));
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

const ease = Easing.inOut(Easing.quad);
const timing = (value: Animated.Value, toValue: number, duration: number) =>
  Animated.timing(value, { toValue, duration, easing: ease, useNativeDriver: true });

/** A star or spark that fades in and out. */
function Twinkle({ x, y, size, char, color, delay }: { x: number; y: number; size: number; char: string; color: string; delay: number }) {
  const v = useLoop((value) => Animated.sequence([timing(value, 1, 700), timing(value, 0.2, 900)]), delay);
  return (
    <Animated.Text style={{ position: "absolute", left: x, top: y, fontSize: size, color, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) }] }}>
      {char}
    </Animated.Text>
  );
}

/** A diya: the lamp stays, the glow behind it breathes and flickers. */
function Diya({ x, y, delay }: { x: number; y: number; delay: number }) {
  const v = useLoop(
    (value) => Animated.sequence([timing(value, 1, 260), timing(value, 0.55, 180), timing(value, 0.9, 220), timing(value, 0.4, 300)]),
    delay,
  );
  return (
    <View style={{ position: "absolute", left: x, top: y, alignItems: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          top: -6,
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: "#FFB703",
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] }) }],
        }}
      />
      <Animated.Text style={{ fontSize: 22, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) }] }}>🪔</Animated.Text>
    </View>
  );
}

/** The crescent moon, always there, with a soft glow breathing behind it. */
function Moon({ x, y }: { x: number; y: number }) {
  const v = useLoop((value) => Animated.sequence([timing(value, 1, 1600), timing(value, 0, 1600)]));
  return (
    <View style={{ position: "absolute", left: x, top: y, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "#FDE68A",
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.35] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] }) }],
        }}
      />
      <Text style={{ fontSize: 30 }}>🌙</Text>
    </View>
  );
}

/** A firework: sparks fly out from a point and fade. */
function Firework({ x, y, colors, size = 46 }: { x: number; y: number; colors: string[]; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  const sparks = 10;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x, top: y }}>
      {Array.from({ length: sparks }, (_, i) => {
        const angle = (i / sparks) * Math.PI * 2;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: colors[i % colors.length],
              opacity: v.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.9, 0] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * size] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * size + 8] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

/** New fireworks at random spots every so often. */
function Fireworks({ box, colors, every }: { box: Box; colors: string[]; every: number }) {
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  useEffect(() => {
    let id = 0;
    const timer = setInterval(() => {
      id += 1;
      const burst = { id, x: 20 + Math.random() * Math.max(box.width - 40, 20), y: 14 + Math.random() * Math.max(box.height * 0.45, 20) };
      setBursts((list) => [...list.slice(-3), burst]);
    }, every);
    return () => clearInterval(timer);
  }, [box.width, box.height, every]);
  return (
    <>
      {bursts.map((b) => (
        <Firework key={b.id} x={b.x} y={b.y} colors={colors} />
      ))}
    </>
  );
}

/** Something that falls (snow, petals) or rises (hearts) through the banner, round and round. */
function Drift({ box, char, size, x, delay, duration, rise, color }: { box: Box; char: string; size: number; x: number; delay: number; duration: number; rise?: boolean; color?: string }) {
  const v = useLoop((value) => Animated.sequence([Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }), Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true })]), delay);
  const from = rise ? box.height + 10 : -24;
  const to = rise ? -30 : box.height + 10;
  return (
    <Animated.Text
      style={{
        position: "absolute",
        left: x,
        top: 0,
        fontSize: size,
        color,
        opacity: v.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 0.95, 0.95, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, rise ? 10 : -8, 0] }) },
        ],
      }}
    >
      {char}
    </Animated.Text>
  );
}

/** A puff of gulal that blooms and fades, then blooms again somewhere else. */
function Puff({ box, color, delay }: { box: Box; color: string; delay: number }) {
  const [spot, setSpot] = useState(() => ({ x: Math.random(), y: Math.random() }));
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let live = true;
    const run = () => {
      v.setValue(0);
      Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
        if (!live) return;
        setSpot({ x: Math.random(), y: Math.random() });
        run();
      });
    };
    const timer = setTimeout(run, delay);
    return () => {
      live = false;
      clearTimeout(timer);
      v.stopAnimation();
    };
  }, [v, delay]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: spot.x * Math.max(box.width - 60, 20),
        top: spot.y * Math.max(box.height - 60, 20),
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.55, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.8] }) }],
      }}
    />
  );
}

/** A lantern swinging on its string from the top edge. */
function Lantern({ x, length, delay }: { x: number; length: number; delay: number }) {
  const v = useLoop((value) => Animated.sequence([timing(value, 1, 1400), timing(value, -1, 1400)]), delay);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: 0,
        alignItems: "center",
        transformOrigin: "top",
        transform: [{ rotate: v.interpolate({ inputRange: [-1, 1], outputRange: ["-9deg", "9deg"] }) }],
      }}
    >
      <View style={{ width: 1, height: length, backgroundColor: "rgba(255,236,179,0.7)" }} />
      <Text style={{ fontSize: 20, marginTop: -2 }}>🏮</Text>
    </Animated.View>
  );
}

/** A row of little bulbs blinking in turn. */
function Lights({ box, colors }: { box: Box; colors: string[] }) {
  const count = Math.max(8, Math.floor(box.width / 26));
  return (
    <View style={{ position: "absolute", top: 6, left: 8, right: 8, flexDirection: "row", justifyContent: "space-between" }}>
      {Array.from({ length: count }, (_, i) => (
        <Bulb key={i} color={colors[i % colors.length]!} delay={(i % 3) * 400} />
      ))}
    </View>
  );
}

function Bulb({ color, delay }: { color: string; delay: number }) {
  const v = useLoop((value) => Animated.sequence([timing(value, 1, 400), Animated.delay(400), timing(value, 0.25, 400)]), delay);
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }] }} />;
}

/** The marigold garland across the top, swaying. */
function Garland({ box }: { box: Box }) {
  const v = useLoop((value) => Animated.sequence([timing(value, 1, 1600), timing(value, -1, 1600)]));
  const count = Math.max(7, Math.floor(box.width / 30));
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: -4,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-around",
        transform: [{ rotate: v.interpolate({ inputRange: [-1, 1], outputRange: ["-2deg", "2deg"] }) }],
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Text key={i} style={{ fontSize: 18, marginTop: Math.sin((i / (count - 1)) * Math.PI) * 10 }}>
          {i % 2 ? "🧡" : "🌼"}
        </Text>
      ))}
    </Animated.View>
  );
}

/** A big heart in the corner, beating. */
function Beat({ char, x, y }: { char: string; x: number; y: number }) {
  const v = useLoop((value) => Animated.sequence([timing(value, 1, 180), timing(value, 0.3, 160), timing(value, 0.85, 180), timing(value, 0, 700)]));
  return (
    <Animated.Text style={{ position: "absolute", left: x, top: y, fontSize: 34, opacity: 0.9, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }] }}>
      {char}
    </Animated.Text>
  );
}

/** A shine that sweeps across now and then. */
function Shine({ box }: { box: Box }) {
  const v = useLoop((value) => Animated.sequence([Animated.timing(value, { toValue: 1, duration: 1600, easing: ease, useNativeDriver: true }), Animated.delay(2600), Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true })]));
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: -30,
        bottom: -30,
        width: 60,
        backgroundColor: "rgba(255,255,255,0.14)",
        transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-120, box.width + 120] }) }, { rotate: "18deg" }],
      }}
    />
  );
}

/** A burst where the banner was tapped. */
export function TapBurst({ x, y, theme }: { x: number; y: number; theme: FestivalTheme }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  const emoji = theme.particles.emoji ?? [];
  const bits = 12;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x, top: y }}>
      {Array.from({ length: bits }, (_, i) => {
        const angle = (i / bits) * Math.PI * 2;
        const distance = 50 + (i % 3) * 18;
        const style = {
          position: "absolute" as const,
          opacity: v.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-8, Math.cos(angle) * distance - 8] }) },
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-10, Math.sin(angle) * distance - 10] }) },
            { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.2, 0.8] }) },
          ],
        };
        return emoji.length && i % 2 === 0 ? (
          <Animated.Text key={i} style={[style, { fontSize: 18 }]}>
            {emoji[(i / 2) % emoji.length]}
          </Animated.Text>
        ) : (
          <Animated.View key={i} style={[style, { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.sparks[i % theme.sparks.length] }]} />
        );
      })}
    </View>
  );
}

/** The live scene for a festival, filling the banner behind its words. */
export function FestivalScene({ theme, box }: { theme: FestivalTheme; box: Box }) {
  const stars = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({ x: Math.random() * Math.max(box.width - 16, 16), y: Math.random() * Math.max(box.height - 20, 20), delay: i * 230, size: 8 + Math.random() * 8 })),
    [box.width, box.height],
  );
  const drift = useMemo(
    () => Array.from({ length: 8 }, (_, i) => ({ x: (i + 0.5) * (box.width / 8) + (Math.random() - 0.5) * 20, delay: i * 520, duration: 3600 + Math.random() * 1800, size: 12 + Math.random() * 8 })),
    [box.width],
  );
  if (!box.width) return null;
  const sparkColor = theme.sparks[0] ?? "#FFFFFF";

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
      {theme.scene === "diyas" && (
        <>
          <Fireworks box={box} colors={theme.sparks} every={1500} />
          {stars.slice(0, 5).map((s, i) => (
            <Twinkle key={i} x={s.x} y={s.y * 0.5} size={s.size} char="✦" color={sparkColor} delay={s.delay} />
          ))}
          {[0.08, 0.3, 0.62, 0.84].map((fx, i) => (
            <Diya key={i} x={fx * box.width} y={box.height - 34} delay={i * 170} />
          ))}
        </>
      )}
      {theme.scene === "lanterns" && (
        <>
          <Moon x={16} y={12} />
          {stars.map((s, i) => (
            <Twinkle key={i} x={s.x} y={s.y} size={s.size} char="✦" color={theme.sparks[i % theme.sparks.length]!} delay={s.delay} />
          ))}
          <Lantern x={box.width - 46} length={26} delay={0} />
          <Lantern x={box.width - 86} length={44} delay={500} />
          <Lantern x={box.width * 0.18 + 30} length={16} delay={900} />
        </>
      )}
      {theme.scene === "colours" &&
        theme.sparks.map((color, i) => <Puff key={i} box={box} color={color} delay={i * 330} />)}
      {theme.scene === "snow" && (
        <>
          {drift.map((d, i) => (
            <Drift key={i} box={box} char="❄" size={d.size} x={d.x} delay={d.delay} duration={d.duration} color="#FFFFFF" />
          ))}
          <Lights box={box} colors={theme.sparks} />
        </>
      )}
      {theme.scene === "fireworks" && (
        <>
          <Fireworks box={box} colors={theme.sparks} every={900} />
          {drift.slice(0, 5).map((d, i) => (
            <Drift key={i} box={box} char={["🎊", "✨", "🎉"][i % 3]!} size={d.size} x={d.x} delay={d.delay} duration={d.duration} />
          ))}
        </>
      )}
      {theme.scene === "hearts" && (
        <>
          <Beat char="💖" x={box.width - 54} y={12} />
          {drift.map((d, i) => (
            <Drift key={i} box={box} char={["💕", "💖", "❤️", "🌹"][i % 4]!} size={d.size} x={d.x} delay={d.delay} duration={d.duration} rise />
          ))}
        </>
      )}
      {theme.scene === "garland" && (
        <>
          {drift.slice(0, 6).map((d, i) => (
            <Drift key={i} box={box} char="🌼" size={d.size - 2} x={d.x} delay={d.delay} duration={d.duration + 800} />
          ))}
          <Garland box={box} />
        </>
      )}
      <Shine box={box} />
    </View>
  );
}

/** The festival emoji by the greeting on Home: it flickers like a flame or beats like a heart. */
export function FestivalEmoji({ theme }: { theme: FestivalTheme }) {
  const v = useLoop((value) =>
    theme.scene === "hearts"
      ? Animated.sequence([timing(value, 1, 180), timing(value, 0.3, 160), timing(value, 0.8, 180), timing(value, 0, 700)])
      : Animated.sequence([timing(value, 1, 300), timing(value, 0.4, 260), timing(value, 0.9, 240), timing(value, 0, 500)]),
  );
  return (
    <Animated.Text style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }] }}>
      {theme.emoji}
    </Animated.Text>
  );
}
