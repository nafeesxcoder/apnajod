/**
 * The pieces around the Ludo board: the night background, the 3D dice,
 * player cards with a ring of dots for the turn clock, the big "CUT!"
 * word, the sound button with its volume, the voice bar and buttons.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, Text, View, useWindowDimensions, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import type { LudoGame, LudoMember } from "../../api/ludoApi";
import { fonts } from "../../theme";
import { PressScale } from "../../components/motion";
import { SEAT_COLORS } from "./board";
import type { LudoBanner } from "./ludoEvents";
import { ludoSound } from "./ludoSound";
import { L, SEAT_DARK, SEAT_LIGHT } from "./ludoTheme";
import type { VoiceRoom, VoiceUser } from "./voiceRoom";

// --- Background -----------------------------------------------------------

export function NightBackground() {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({ x: ((i * 97) % 100) / 100, y: ((i * 61) % 100) / 100, s: 1 + (i % 3) })),
    [],
  );
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient colors={[L.bgTop, L.bgMid, L.bgBottom]} style={{ flex: 1 }} />
      {stars.map((s, i) => (
        <View key={i} style={{ position: "absolute", left: s.x * width, top: s.y * height, width: s.s, height: s.s, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.5)" }} />
      ))}
    </View>
  );
}

// --- People ----------------------------------------------------------------

export function Avatar({ member, size, ring }: { member?: Pick<LudoMember, "name" | "photo"> | null; size: number; ring?: string }) {
  const initial = (member?.name || "?").charAt(0).toUpperCase();
  const [broken, setBroken] = useState(false);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ring ? 2.5 : 0,
        borderColor: ring,
        overflow: "hidden",
        backgroundColor: "#3B2A7A",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {member?.photo && !broken ? (
        <Image source={{ uri: member.photo }} onError={() => setBroken(true)} style={{ width: "100%", height: "100%" }} />
      ) : (
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: size * 0.42, color: "#FFFFFF" }}>{initial}</Text>
      )}
    </View>
  );
}

/** The turn clock: a ring of dots round the photo that go out one by one. */
function ClockRing({ deadline, seconds, size, color }: { deadline: string | null; seconds: number; size: number; color: string }) {
  const [left, setLeft] = useState(() => (deadline ? Math.max(0, new Date(deadline).getTime() - Date.now()) : 0));
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLeft(Math.max(0, new Date(deadline).getTime() - Date.now()));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [deadline]);
  const dots = 18;
  const lit = Math.ceil((left / (seconds * 1000)) * dots);
  const radius = size / 2;
  const urgent = lit <= dots * 0.3;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, width: size, height: size }}>
      {Array.from({ length: dots }, (_, i) => {
        const angle = (i / dots) * Math.PI * 2 - Math.PI / 2;
        const on = i < lit;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: radius + Math.cos(angle) * (radius - 3) - 3,
              top: radius + Math.sin(angle) * (radius - 3) - 3,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: on ? (urgent ? L.red : color) : "rgba(255,255,255,0.15)",
            }}
          />
        );
      })}
    </View>
  );
}

export function PlayerCard({ game, seat, voice, myId, flip }: { game: LudoGame; seat: number; voice: VoiceUser[]; myId: string; flip?: boolean }) {
  const state = game.state!;
  const player = state.players.find((p) => p.seat === seat);
  if (!player) return <View style={{ flex: 1 }} />;
  const member = game.members.find((m) => m.userId === player.userId);
  const turn = state.turnUserId === player.userId;
  const inVoice = voice.find((v) => v.userId === player.userId);
  const home = player.tokens.filter((t) => t === 56).length;
  const ring = 56;
  return (
    <View
      accessibilityLabel={`${member?.name}${turn ? ", playing now" : ""}${player.place ? `, finished ${player.place}` : ""}`}
      style={{
        flex: 1,
        flexDirection: flip ? "row-reverse" : "row",
        alignItems: "center",
        gap: 8,
        padding: 8,
        borderRadius: 18,
        backgroundColor: turn ? "rgba(255,255,255,0.14)" : L.glass,
        borderWidth: 1.5,
        borderColor: turn ? SEAT_COLORS[seat] : L.glassBorder,
        opacity: player.out ? 0.4 : 1,
        shadowColor: SEAT_COLORS[seat],
        shadowOpacity: turn ? 0.8 : 0,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <View style={{ width: ring, height: ring, alignItems: "center", justifyContent: "center" }}>
        <Avatar member={member} size={ring - 16} ring={SEAT_COLORS[seat]} />
        {turn && <ClockRing deadline={game.turnDeadline} seconds={game.turnSeconds} size={ring} color={SEAT_LIGHT[seat]!} />}
        {inVoice && (
          <View style={{ position: "absolute", right: 0, bottom: 0, width: 19, height: 19, borderRadius: 10, backgroundColor: inVoice.muted ? "#6B7280" : L.green, borderWidth: 2, borderColor: L.bgMid, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={inVoice.muted ? "mic-off" : "mic"} size={10} color="#FFFFFF" />
          </View>
        )}
      </View>
      <View style={{ flex: 1, alignItems: flip ? "flex-end" : "flex-start" }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: L.text }}>
          {player.userId === myId ? "You" : member?.name ?? "Player"}
        </Text>
        {player.out ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 11, color: L.textMuted }}>Left</Text>
        ) : player.place ? (
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: L.gold }}>{["1st", "2nd", "3rd", "4th"][player.place - 1]} 🏆</Text>
        ) : (
          <View style={{ flexDirection: "row", gap: 3, marginTop: 3 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: i < home ? SEAT_COLORS[seat] : "transparent", borderWidth: 1.5, borderColor: SEAT_COLORS[seat] }} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// --- Dice --------------------------------------------------------------------

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
};

function DiceFace({ value, size }: { value: number; size: number }) {
  const pip = size * 0.19;
  const gap = (size - pip * 3) / 4;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: "#C9C4DE", paddingBottom: size * 0.07 }}>
      <LinearGradient colors={["#FFFFFF", "#F1EEF9"]} style={{ flex: 1, borderRadius: size * 0.22 }}>
        {(PIPS[value] ?? []).map(([row, col], i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              width: pip,
              height: pip,
              borderRadius: pip / 2,
              backgroundColor: value === 1 || value === 6 ? "#D7263D" : "#1F1640",
              top: gap * 0.9 + row * (pip + gap * 0.9),
              left: gap + col * (pip + gap),
              borderTopWidth: 1.5,
              borderTopColor: "rgba(0,0,0,0.35)",
            }}
          />
        ))}
      </LinearGradient>
    </View>
  );
}

export function Dice({ value, rolling, size = 66, live }: { value: number | null; rolling: boolean; size?: number; live?: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const [face, setFace] = useState(value ?? 6);

  useEffect(() => {
    if (!rolling) {
      if (value) setFace(value);
      // Lands with a little bounce.
      Animated.sequence([
        Animated.timing(hop, { toValue: -0.25, duration: 90, useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: true }),
      ]).start();
      return;
    }
    const timer = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 70);
    const anim = Animated.loop(
      Animated.parallel([
        Animated.timing(spin, { toValue: 1, duration: 380, easing: Easing.linear, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(hop, { toValue: -1, duration: 190, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(hop, { toValue: 0, duration: 190, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => {
      clearInterval(timer);
      anim.stop();
      spin.setValue(0);
    };
  }, [rolling, value, spin, hop]);

  useEffect(() => {
    if (!live) {
      breathe.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live, breathe]);

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: hop.interpolate({ inputRange: [-1, 0], outputRange: [-size * 0.45, 0] }) },
          { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
          { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
        ],
        shadowColor: "#000",
        shadowOpacity: 0.45,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
    >
      <DiceFace value={face} size={size} />
    </Animated.View>
  );
}

// --- The big word on the board -------------------------------------------------

const BANNER_COLORS: Record<LudoBanner["kind"], [string, string]> = {
  cut: ["#FF5A5F", "#B3123A"],
  home: ["#5EE38B", "#138A46"],
  six: ["#FFE07A", "#E59A00"],
  lost: ["#C4B5FD", "#6D28D9"],
  none: ["#E5E7EB", "#6B7280"],
};

export function Banner({ banner, stamp }: { banner: LudoBanner | null; stamp: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!banner) return;
    v.setValue(0);
    Animated.sequence([
      Animated.spring(v, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(v, { toValue: 2, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [stamp, banner, v]);
  if (!banner) return null;
  const [light, dark] = BANNER_COLORS[banner.kind];
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        opacity: v.interpolate({ inputRange: [0, 0.3, 1, 2], outputRange: [0, 1, 1, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1, 1.3] }) }],
      }}
    >
      <LinearGradient colors={[light, dark]} style={{ paddingHorizontal: 26, paddingVertical: 10, borderRadius: 22, borderWidth: 3, borderColor: "#FFFFFF", alignItems: "center", transform: [{ rotate: "-4deg" }] }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 38, lineHeight: 44, color: "#FFFFFF", letterSpacing: 2, textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } }}>
          {banner.kind === "cut" ? "✂️ " : banner.kind === "home" ? "🏠 " : banner.kind === "six" ? "🎲 " : ""}
          {banner.text}
        </Text>
        {!!banner.sub && <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#FFFFFF" }}>{banner.sub}</Text>}
      </LinearGradient>
    </Animated.View>
  );
}

// --- Sound ---------------------------------------------------------------------

export function useLudoSoundSettings() {
  const [, setN] = useState(0);
  useEffect(() => {
    void ludoSound.load();
    return ludoSound.subscribe(() => setN((n) => n + 1));
  }, []);
  return { volume: ludoSound.volume, muted: ludoSound.muted };
}

const LEVELS = [0.2, 0.4, 0.6, 0.8, 1];

export function SoundPanel({ onClose }: { onClose: () => void }) {
  const { volume, muted } = useLudoSoundSettings();
  const shown = muted ? 0 : volume;
  return (
    <View
      accessibilityLabel="Game sound"
      style={{ position: "absolute", top: 54, right: 12, zIndex: 80, width: 236, borderRadius: 20, padding: 14, backgroundColor: "#24154F", borderWidth: 1, borderColor: L.glassBorder, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 16, elevation: 12 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: L.text }}>Game sound</Text>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: L.textSoft }}>{Math.round(shown * 100)}%</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10} style={{ marginLeft: 10 }}>
          <Ionicons name="close" size={20} color={L.textSoft} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={muted ? "Sound on" : "Mute"}
          onPress={() => ludoSound.set({ muted: !muted })}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: muted ? L.red : L.glassStrong, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name={muted ? "volume-mute" : "volume-high"} size={19} color="#FFFFFF" />
        </Pressable>
        {LEVELS.map((level, i) => (
          <Pressable
            key={level}
            accessibilityRole="adjustable"
            accessibilityLabel={`Volume ${Math.round(level * 100)} percent`}
            onPress={() => {
              ludoSound.set({ volume: level, muted: false });
              ludoSound.play("step");
            }}
            hitSlop={{ top: 12, bottom: 12, left: 2, right: 2 }}
            style={{ flex: 1, height: 14 + i * 7, borderRadius: 5, backgroundColor: shown >= level - 0.001 ? L.gold : "rgba(255,255,255,0.18)" }}
          />
        ))}
      </View>
    </View>
  );
}

export function SoundButton({ onPress }: { onPress: () => void }) {
  const { volume, muted } = useLudoSoundSettings();
  const icon = muted || volume === 0 ? "volume-mute" : volume < 0.5 ? "volume-low" : "volume-high";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Game sound and volume"
      onPress={onPress}
      hitSlop={8}
      style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: L.glassStrong, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={19} color={muted ? L.red : L.text} />
    </Pressable>
  );
}

// --- Voice ---------------------------------------------------------------------

export function VoiceBar({ room, users, onJoin, onLeave, busy }: { room: VoiceRoom | null; users: VoiceUser[]; onJoin: () => void; onLeave: () => void; busy: boolean }) {
  const others = users.length - (room ? 1 : 0);
  if (!room) {
    return (
      <PressScale
        accessibilityRole="button"
        accessibilityLabel="Turn on mic to talk"
        onPress={onJoin}
        disabled={busy}
        containerStyle={{ alignSelf: "center" }}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 20, backgroundColor: L.green }}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="mic" size={18} color="#FFFFFF" />}
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: "#FFFFFF" }}>{others > 0 ? `Talk live · ${others} on mic` : "Turn on mic to talk"}</Text>
      </PressScale>
    );
  }
  const round: ViewStyle = { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(34,197,94,0.16)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(34,197,94,0.45)" }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: L.green }} />
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: "#BBF7D0" }}>Live · {users.length} on mic</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={room.muted ? "Unmute" : "Mute"} onPress={() => room.setMuted(!room.muted)} style={[round, { backgroundColor: room.muted ? L.red : L.glassStrong }]}>
        <Ionicons name={room.muted ? "mic-off" : "mic"} size={19} color="#FFFFFF" />
      </Pressable>
      {Platform.OS !== "web" && (
        <Pressable accessibilityRole="button" accessibilityLabel={room.speaker ? "Speaker off" : "Speaker on"} onPress={() => room.setSpeaker(!room.speaker)} style={[round, { backgroundColor: room.speaker ? "#3B82F6" : L.glassStrong }]}>
          <Ionicons name="volume-high" size={19} color="#FFFFFF" />
        </Pressable>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Turn off mic" onPress={onLeave} style={[round, { backgroundColor: "rgba(244,63,94,0.18)" }]}>
        <Ionicons name="call" size={18} color={L.red} style={{ transform: [{ rotate: "135deg" }] }} />
      </Pressable>
    </View>
  );
}

// --- Buttons and the win ---------------------------------------------------------

export function GoldButton({ label, onPress, disabled, busy, tone = "gold", accessibilityLabel }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean; tone?: "gold" | "green"; accessibilityLabel?: string }) {
  const colors: [string, string] = tone === "gold" ? [L.goldLight, L.goldDark] : ["#4ADE80", "#15803D"];
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || busy}
      onPress={onPress}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <LinearGradient colors={colors} style={{ borderRadius: 999, paddingVertical: 15, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)" }}>
        {busy ? <ActivityIndicator color="#1A0D45" /> : <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: tone === "gold" ? "#2B1466" : "#FFFFFF" }}>{label}</Text>}
      </LinearGradient>
    </PressScale>
  );
}

export function Confetti() {
  const { width, height } = useWindowDimensions();
  const bits = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        x: Math.random() * width,
        delay: Math.random() * 900,
        color: [...SEAT_COLORS, L.gold, "#FFFFFF"][i % 6]!,
        size: 6 + Math.random() * 6,
        spin: Math.random() > 0.5 ? 1 : -1,
        v: new Animated.Value(0),
      })),
    [width],
  );
  useEffect(() => {
    bits.forEach((b) => Animated.timing(b.v, { toValue: 1, duration: 2600, delay: b.delay, easing: Easing.in(Easing.quad), useNativeDriver: true }).start());
  }, [bits]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}>
      {bits.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: b.x,
            top: 0,
            width: b.size,
            height: b.size * 1.6,
            borderRadius: 2,
            backgroundColor: b.color,
            opacity: b.v.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: b.v.interpolate({ inputRange: [0, 1], outputRange: [-40, height * 0.95] }) },
              { rotate: b.v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${b.spin * 720}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

export { SEAT_DARK, SEAT_LIGHT };
