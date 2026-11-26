/**
 * The Ludo board: a gold-framed board with glossy tokens that hop square
 * by square (with a tap of sound on each), glow when they can move, and
 * stand a little apart when they share a square.
 */
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import type { LudoGame } from "../../api/ludoApi";
import { HOME_COLUMNS, pathFor, pointFor, SEAT_COLORS, squareKey, STARS, START, TRACK, YARDS } from "./board";
import { L, SEAT_DARK, SEAT_LIGHT } from "./ludoTheme";
import type { BoardTheme, TokenStyle } from "./ludoLooks";

const SEAT_NAMES = ["Red", "Green", "Yellow", "Blue"];

function Token({
  seat,
  token,
  progress,
  cell,
  offset,
  movable,
  onPress,
  onStep,
  look,
  stepMs,
}: {
  seat: number;
  token: number;
  progress: number;
  cell: number;
  offset: { x: number; y: number };
  movable: boolean;
  onPress: () => void;
  onStep: () => void;
  look: TokenStyle;
  stepMs: number;
}) {
  const size = cell * 0.82;
  const place = (p: { x: number; y: number }) => ({ x: (p.x + offset.x) * cell - size / 2, y: (p.y + offset.y) * cell - size / 2 });
  const pos = useRef(new Animated.ValueXY(place(pointFor(seat, progress, token)))).current;
  const lift = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const prev = useRef(progress);

  useEffect(() => {
    const from = prev.current;
    prev.current = progress;
    if (from === progress) {
      Animated.timing(pos, { toValue: place(pointFor(seat, progress, token)), duration: 160, useNativeDriver: false }).start();
      return;
    }
    if (progress < 0 || progress < from) {
      // Cut: flies back to the yard.
      Animated.parallel([
        Animated.timing(pos, { toValue: place(pointFor(seat, progress, token)), duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.sequence([
          Animated.timing(lift, { toValue: 1.4, duration: 260, useNativeDriver: false }),
          Animated.timing(lift, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: false }),
        ]),
      ]).start();
      return;
    }
    const steps = pathFor(seat, from, progress, token);
    Animated.sequence(
      steps.map((p) =>
        Animated.parallel([
          Animated.timing(pos, { toValue: place(p), duration: stepMs, easing: Easing.out(Easing.quad), useNativeDriver: false }),
          Animated.sequence([
            Animated.timing(lift, { toValue: 1, duration: stepMs / 2, easing: Easing.out(Easing.quad), useNativeDriver: false }),
            Animated.timing(lift, { toValue: 0, duration: stepMs / 2, easing: Easing.in(Easing.quad), useNativeDriver: false }),
          ]),
        ]),
      ),
    ).start();
    // One tap of sound as it lands on each square.
    const timers = steps.map((_, i) => setTimeout(onStep, stepMs * (i + 1)));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, cell, offset.x, offset.y]);

  useEffect(() => {
    if (!movable) {
      glow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 450, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [movable, glow]);

  const lifted = Animated.add(lift, Animated.multiply(glow, 0.35));
  return (
    <Animated.View style={{ position: "absolute", left: pos.x, top: pos.y, width: size, height: size, zIndex: movable ? 40 : 20 }}>
      {/* Shadow on the board, smaller as the token lifts. */}
      <Animated.View
        style={{
          position: "absolute",
          left: size * 0.12,
          right: size * 0.12,
          bottom: -size * 0.06,
          height: size * 0.28,
          borderRadius: size,
          backgroundColor: "rgba(0,0,0,0.35)",
          transform: [{ scale: lifted.interpolate({ inputRange: [0, 1.4], outputRange: [1, 0.55] }) }],
        }}
      />
      {movable && (
        <Animated.View
          style={{
            position: "absolute",
            left: -size * 0.22,
            top: -size * 0.22,
            width: size * 1.44,
            height: size * 1.44,
            borderRadius: size,
            borderWidth: 2.5,
            borderColor: L.gold,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.05] }) }],
          }}
        />
      )}
      <Animated.View style={{ flex: 1, transform: [{ translateY: lifted.interpolate({ inputRange: [0, 1.4], outputRange: [0, -size * 0.6] }) }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${SEAT_NAMES[seat]} token ${token + 1}${movable ? ", can move" : ""}`}
          disabled={!movable}
          onPress={onPress}
          hitSlop={8}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={[SEAT_LIGHT[seat]!, SEAT_COLORS[seat]!, SEAT_DARK[seat]!]}
            start={{ x: 0.25, y: 0 }}
            end={{ x: 0.75, y: 1 }}
            style={{
              flex: 1,
              borderRadius: look.shape === "gem" ? size * 0.18 : size / 2,
              borderWidth: 2.5,
              borderColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
              transform: look.shape === "gem" ? [{ rotate: "45deg" }, { scale: 0.86 }] : undefined,
            }}
          >
            {look.mark ? (
              <Text style={{ color: "#FFFFFF", fontSize: size * 0.5, lineHeight: size * 0.62, textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 2 }}>{look.mark}</Text>
            ) : (
              <View style={{ width: size * 0.42, height: size * 0.42, borderRadius: look.shape === "gem" ? size * 0.08 : size, backgroundColor: SEAT_DARK[seat], borderWidth: 2, borderColor: "rgba(255,255,255,0.85)" }} />
            )}
            {/* Gloss. */}
            <View style={{ position: "absolute", top: size * 0.1, left: size * 0.2, width: size * 0.3, height: size * 0.16, borderRadius: size, backgroundColor: "rgba(255,255,255,0.6)" }} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export function LudoBoard({
  game,
  myId,
  size,
  onMove,
  onStep,
  theme,
  tokenStyle,
  stepMs = 150,
}: {
  game: LudoGame;
  myId: string;
  size: number;
  onMove: (token: number) => void;
  onStep: () => void;
  theme: BoardTheme;
  tokenStyle: TokenStyle;
  stepMs?: number;
}) {
  const frame = 6;
  const inner = size - frame * 2;
  const cell = inner / 15;
  const state = game.state!;
  const myTurn = state.turnUserId === myId && state.rolled;
  const active = new Set(state.players.filter((p) => !p.out).map((p) => p.seat));
  const turnSeat = state.players.find((p) => p.userId === state.turnUserId)?.seat ?? -1;

  // Tokens that share a square stand a little apart.
  const offsets = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const p of state.players) {
      if (p.out) continue;
      p.tokens.forEach((progress, i) => {
        const key = squareKey(p.seat, progress, i);
        groups.set(key, [...(groups.get(key) ?? []), `${p.seat}-${i}`]);
      });
    }
    const out: Record<string, { x: number; y: number }> = {};
    for (const ids of groups.values()) {
      ids.forEach((id, i) => {
        const d = ids.length > 1 ? (i - (ids.length - 1) / 2) * 0.22 : 0;
        out[id] = { x: d, y: -Math.abs(d) * 0.3 };
      });
    }
    return out;
  }, [state.players]);

  const square = (key: string, r: number, c: number, color: string, children?: React.ReactNode) => (
    <View
      key={key}
      style={{ position: "absolute", top: r * cell, left: c * cell, width: cell, height: cell, backgroundColor: color, borderWidth: 0.6, borderColor: theme.line, alignItems: "center", justifyContent: "center" }}
    >
      {children}
    </View>
  );

  return (
    <LinearGradient
      colors={theme.frame}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, alignSelf: "center", borderRadius: 22, padding: frame, shadowColor: theme.frame[1], shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 10 }}
    >
      <View style={{ width: inner, height: inner, borderRadius: 16, overflow: "hidden", backgroundColor: theme.cell }}>
        {YARDS.map((yard, seat) => {
          const on = active.has(seat);
          const glowing = seat === turnSeat;
          return (
            <LinearGradient
              key={`yard-${seat}`}
              colors={on ? [SEAT_LIGHT[seat]!, SEAT_COLORS[seat]!, SEAT_DARK[seat]!] : ["#9CA3AF", "#5B5478", "#4B5563"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: "absolute", top: yard.r * cell, left: yard.c * cell, width: cell * 6, height: cell * 6, padding: cell * 0.75 }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: cell * 0.9,
                  backgroundColor: "rgba(255,255,255,0.94)",
                  borderWidth: glowing ? 3 : 0,
                  borderColor: L.gold,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignContent: "center",
                  justifyContent: "center",
                }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ width: "50%", height: cell * 2.1, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: cell * 1.05, height: cell * 1.05, borderRadius: cell, backgroundColor: on ? SEAT_COLORS[seat] : "#9CA3AF", opacity: 0.22 }} />
                  </View>
                ))}
              </View>
            </LinearGradient>
          );
        })}
        {TRACK.map((sq, i) => {
          const startSeat = START.indexOf(i as 0 | 13 | 26 | 39);
          if (startSeat >= 0) return square(`t${i}`, sq.r, sq.c, SEAT_COLORS[startSeat]!, <Text style={{ fontSize: cell * 0.6, color: "#FFFFFF", lineHeight: cell * 0.8 }}>★</Text>);
          return square(`t${i}`, sq.r, sq.c, theme.cell, STARS.has(i) ? <Text style={{ fontSize: cell * 0.62, color: theme.star, lineHeight: cell * 0.8 }}>★</Text> : null);
        })}
        {HOME_COLUMNS.map((column, seat) =>
          column.map((sq, i) => square(`h${seat}-${i}`, sq.r, sq.c, active.has(seat) ? SEAT_COLORS[seat]! : "#9CA3AF")),
        )}
        {/* The middle: four triangles, one per colour, and a gold star. */}
        <View
          style={{
            position: "absolute",
            top: 6 * cell,
            left: 6 * cell,
            width: 0,
            height: 0,
            borderTopWidth: 1.5 * cell,
            borderBottomWidth: 1.5 * cell,
            borderLeftWidth: 1.5 * cell,
            borderRightWidth: 1.5 * cell,
            borderTopColor: SEAT_COLORS[1],
            borderRightColor: SEAT_COLORS[2],
            borderBottomColor: SEAT_COLORS[3],
            borderLeftColor: SEAT_COLORS[0],
          }}
        />
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: 7.5 * cell - cell * 0.55, left: 7.5 * cell - cell * 0.55, width: cell * 1.1, height: cell * 1.1, borderRadius: cell, backgroundColor: theme.center, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: cell * 0.62, color: "#FFFFFF", lineHeight: cell * 0.8 }}>{theme.centerMark ?? "★"}</Text>
        </View>
        {state.players
          .filter((p) => !p.out)
          .flatMap((p) =>
            p.tokens.map((progress, i) => (
              <Token
                key={`${p.seat}-${i}`}
                seat={p.seat}
                token={i}
                progress={progress}
                cell={cell}
                offset={offsets[`${p.seat}-${i}`] ?? { x: 0, y: 0 }}
                movable={myTurn && p.userId === myId && state.movable.includes(i)}
                onPress={() => onMove(i)}
                onStep={onStep}
                look={tokenStyle}
                stepMs={stepMs}
              />
            )),
          )}
      </View>
    </LinearGradient>
  );
}
