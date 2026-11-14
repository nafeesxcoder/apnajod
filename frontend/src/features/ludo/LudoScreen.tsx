/**
 * Ludo for 2 to 4 players, with live voice.
 *
 * - New game: pick 2, 3 or 4 players and invite matches.
 * - Room: who joined, who is still invited; the host starts once two are in.
 * - Game: the board, the dice (rolled on the server), tokens that walk
 *   square by square, a 30-second clock on each turn, and the results.
 * - Voice: turn the mic on to talk to everyone in the game, mute, speaker.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { type LudoGame, type LudoMember, ludoApi } from "../../api/ludoApi";
import { matchApi, type MutualMatchSummary } from "../../api/matchApi";
import { getChatSocket } from "../../api/chatSocket";
import { fonts, palette, radius } from "../../theme";
import { PressScale } from "../../components/motion";
import { HOME_COLUMNS, pathFor, pointFor, SEAT_COLORS, SEAT_TINTS, squareKey, STARS, START, TRACK, YARDS } from "./board";
import { VoiceRoom, type VoiceUser } from "./voiceRoom";

const MAX_BOARD = 440;

function Avatar({ member, size, ring }: { member?: LudoMember | null; size: number; ring?: string }) {
  const initial = (member?.name || "?").charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: ring ? 3 : 0, borderColor: ring, overflow: "hidden", backgroundColor: palette.paperSand, alignItems: "center", justifyContent: "center" }}>
      {member?.photo ? (
        <Image source={{ uri: member.photo }} style={{ width: "100%", height: "100%" }} />
      ) : (
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.42, color: palette.ink }}>{initial}</Text>
      )}
    </View>
  );
}

// --- Dice ---------------------------------------------------------------

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
};

function DiceFace({ value, size }: { value: number; size: number }) {
  const pip = size * 0.18;
  const gap = (size - pip * 3) / 4;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.2, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#E5E7EB" }}>
      {(PIPS[value] ?? []).map(([row, col], i) => (
        <View
          key={i}
          style={{ position: "absolute", width: pip, height: pip, borderRadius: pip / 2, backgroundColor: value === 1 ? "#E53935" : "#111827", top: gap + row * (pip + gap), left: gap + col * (pip + gap) }}
        />
      ))}
    </View>
  );
}

function Dice({ value, rolling, size = 64 }: { value: number | null; rolling: boolean; size?: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  const [face, setFace] = useState(value ?? 6);
  useEffect(() => {
    if (!rolling) {
      if (value) setFace(value);
      return;
    }
    const timer = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 80);
    const anim = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 450, easing: Easing.linear, useNativeDriver: true }));
    anim.start();
    return () => {
      clearInterval(timer);
      anim.stop();
      spin.setValue(0);
    };
  }, [rolling, value, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <DiceFace value={face} size={size} />
    </Animated.View>
  );
}

// --- Board --------------------------------------------------------------

function Token({
  seat,
  token,
  progress,
  cell,
  offset,
  movable,
  onPress,
}: {
  seat: number;
  token: number;
  progress: number;
  cell: number;
  offset: { x: number; y: number };
  movable: boolean;
  onPress: () => void;
}) {
  const size = cell * 0.78;
  const place = (p: { x: number; y: number }) => ({ x: (p.x + offset.x) * cell - size / 2, y: (p.y + offset.y) * cell - size / 2 });
  const pos = useRef(new Animated.ValueXY(place(pointFor(seat, progress, token)))).current;
  const prev = useRef(progress);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const from = prev.current;
    prev.current = progress;
    if (from === progress) {
      Animated.timing(pos, { toValue: place(pointFor(seat, progress, token)), duration: 150, useNativeDriver: false }).start();
      return;
    }
    const steps = progress < 0 || progress < from ? [pointFor(seat, progress, token)] : pathFor(seat, from, progress, token);
    Animated.sequence(
      steps.map((p) => Animated.timing(pos, { toValue: place(p), duration: progress < 0 ? 380 : 140, easing: Easing.out(Easing.quad), useNativeDriver: false })),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, cell, offset.x, offset.y]);

  useEffect(() => {
    if (!movable) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 420, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 420, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [movable, pulse]);

  return (
    <Animated.View style={{ position: "absolute", left: pos.x, top: pos.y, width: size, height: size, zIndex: movable ? 30 : 20 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${["Red", "Green", "Yellow", "Blue"][seat]} token ${token + 1}${movable ? ", can move" : ""}`}
        disabled={!movable}
        onPress={onPress}
        hitSlop={6}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={{
            flex: 1,
            borderRadius: size / 2,
            backgroundColor: SEAT_COLORS[seat],
            borderWidth: pulse.interpolate({ inputRange: [0, 1], outputRange: [2.5, 4] }),
            borderColor: movable ? "#111827" : "#FFFFFF",
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
          }}
        >
          <View style={{ width: size * 0.36, height: size * 0.36, borderRadius: size, backgroundColor: "rgba(255,255,255,0.75)" }} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function Board({ game, myId, size, onMove }: { game: LudoGame; myId: string; size: number; onMove: (token: number) => void }) {
  const cell = size / 15;
  const state = game.state!;
  const myTurn = state.turnUserId === myId && state.rolled;
  const active = new Set(state.players.filter((p) => !p.out).map((p) => p.seat));

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
        const d = ids.length > 1 ? (i - (ids.length - 1) / 2) * 0.24 : 0;
        out[id] = { x: d, y: d * 0.4 };
      });
    }
    return out;
  }, [state.players]);

  const square = (r: number, c: number, color: string, children?: React.ReactNode, key?: string) => (
    <View
      key={key ?? `${r}-${c}`}
      style={{ position: "absolute", top: r * cell, left: c * cell, width: cell, height: cell, backgroundColor: color, borderWidth: 0.5, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" }}
    >
      {children}
    </View>
  );

  return (
    <View style={{ width: size, height: size, alignSelf: "center", borderRadius: 12, overflow: "hidden", backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#1F2937" }}>
      {YARDS.map((yard, seat) => (
        <View
          key={`yard-${seat}`}
          style={{ position: "absolute", top: yard.r * cell, left: yard.c * cell, width: cell * 6, height: cell * 6, backgroundColor: active.has(seat) ? SEAT_COLORS[seat] : "#9CA3AF", padding: cell * 0.7 }}
        >
          <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: cell * 0.6 }} />
        </View>
      ))}
      {TRACK.map((sq, i) => {
        const startSeat = START.indexOf(i as 0 | 13 | 26 | 39);
        const color = startSeat >= 0 ? SEAT_COLORS[startSeat]! : "#FFFFFF";
        return square(sq.r, sq.c, color, STARS.has(i) ? <Text style={{ fontSize: cell * 0.55, color: "#9CA3AF" }}>★</Text> : startSeat >= 0 ? <Text style={{ fontSize: cell * 0.5, color: "#FFFFFF" }}>★</Text> : null, `t${i}`);
      })}
      {HOME_COLUMNS.map((column, seat) => column.map((sq, i) => square(sq.r, sq.c, SEAT_TINTS[seat]!, <View style={{ width: cell * 0.7, height: cell * 0.7, borderRadius: 4, backgroundColor: SEAT_COLORS[seat], opacity: 0.85 }} />, `h${seat}-${i}`)))}
      {/* The middle: four triangles, one per colour. */}
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
      {state.players.filter((p) => !p.out).flatMap((p) =>
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
          />
        )),
      )}
    </View>
  );
}

// --- Players ------------------------------------------------------------

function Clock({ deadline, seconds }: { deadline: string | null; seconds: number }) {
  const [left, setLeft] = useState(() => (deadline ? Math.max(0, new Date(deadline).getTime() - Date.now()) : 0));
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLeft(Math.max(0, new Date(deadline).getTime() - Date.now()));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [deadline]);
  const share = Math.min(1, left / (seconds * 1000));
  return (
    <View style={{ height: 5, borderRadius: 3, backgroundColor: "#E5E7EB", overflow: "hidden", marginTop: 4 }}>
      <View style={{ width: `${share * 100}%`, height: "100%", backgroundColor: share < 0.3 ? "#DC2626" : "#16A34A" }} />
    </View>
  );
}

function PlayerChip({ game, seat, voice }: { game: LudoGame; seat: number; voice: VoiceUser[] }) {
  const state = game.state!;
  const player = state.players.find((p) => p.seat === seat);
  if (!player) return <View style={{ flex: 1 }} />;
  const member = game.members.find((m) => m.userId === player.userId);
  const turn = state.turnUserId === player.userId;
  const inVoice = voice.find((v) => v.userId === player.userId);
  const home = player.tokens.filter((t) => t === 56).length;
  return (
    <View
      accessibilityLabel={`${member?.name}${turn ? ", playing now" : ""}${player.place ? `, finished ${player.place}` : ""}`}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 8,
        borderRadius: 14,
        backgroundColor: turn ? SEAT_TINTS[seat] : "#FFFFFF",
        borderWidth: turn ? 2 : 1,
        borderColor: turn ? SEAT_COLORS[seat] : "#E5E7EB",
        opacity: player.out ? 0.45 : 1,
      }}
    >
      <View>
        <Avatar member={member} size={38} ring={SEAT_COLORS[seat]} />
        {inVoice && (
          <View style={{ position: "absolute", right: -4, bottom: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: inVoice.muted ? "#6B7280" : "#16A34A", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={inVoice.muted ? "mic-off" : "mic"} size={11} color="#FFFFFF" />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink }}>
          {member?.name ?? "Player"}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 11, color: palette.slate }}>
          {player.out ? "Left" : player.place ? `${["1st", "2nd", "3rd", "4th"][player.place - 1]} 🏆` : `${home}/4 home`}
        </Text>
        {turn && <Clock deadline={game.turnDeadline} seconds={game.turnSeconds} />}
      </View>
    </View>
  );
}

// --- Voice bar ----------------------------------------------------------

function VoiceBar({ room, users, onJoin, onLeave, busy }: { room: VoiceRoom | null; users: VoiceUser[]; onJoin: () => void; onLeave: () => void; busy: boolean }) {
  const others = users.length - (room ? 1 : 0);
  if (!room) {
    return (
      <PressScale
        accessibilityRole="button"
        accessibilityLabel="Turn on mic to talk"
        onPress={onJoin}
        disabled={busy}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#16A34A", borderRadius: radius.pill, paddingVertical: 11, paddingHorizontal: 18 }}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="mic" size={18} color="#FFFFFF" />}
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: "#FFFFFF" }}>
          {others > 0 ? `Talk live · ${others} on mic` : "Turn on mic to talk"}
        </Text>
      </PressScale>
    );
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#DCFCE7", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A" }} />
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#166534" }}>Live · {users.length} on mic</Text>
      </View>
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={room.muted ? "Unmute" : "Mute"}
        onPress={() => room.setMuted(!room.muted)}
        style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: room.muted ? "#DC2626" : "#111827", alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name={room.muted ? "mic-off" : "mic"} size={19} color="#FFFFFF" />
      </PressScale>
      {Platform.OS !== "web" && (
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={room.speaker ? "Speaker off" : "Speaker on"}
          onPress={() => room.setSpeaker(!room.speaker)}
          style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: room.speaker ? "#1D4ED8" : "#E5E7EB", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="volume-high" size={19} color={room.speaker ? "#FFFFFF" : "#111827"} />
        </PressScale>
      )}
      <PressScale
        accessibilityRole="button"
        accessibilityLabel="Turn off mic"
        onPress={onLeave}
        style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name="call" size={18} color="#DC2626" style={{ transform: [{ rotate: "135deg" }] }} />
      </PressScale>
    </View>
  );
}

// --- Celebration ---------------------------------------------------------

function Confetti() {
  const { width, height } = useWindowDimensions();
  const bits = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ x: Math.random() * width, delay: Math.random() * 600, char: ["🎉", "✨", "🏆", "🎊", "⭐"][i % 5]!, v: new Animated.Value(0) })), [width]);
  useEffect(() => {
    bits.forEach((b) => Animated.timing(b.v, { toValue: 1, duration: 2200, delay: b.delay, easing: Easing.in(Easing.quad), useNativeDriver: true }).start());
  }, [bits]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      {bits.map((b, i) => (
        <Animated.Text key={i} style={{ position: "absolute", left: b.x, top: 0, fontSize: 20, opacity: b.v.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: b.v.interpolate({ inputRange: [0, 1], outputRange: [-30, height * 0.8] }) }] }}>
          {b.char}
        </Animated.Text>
      ))}
    </View>
  );
}

// --- The screen ----------------------------------------------------------

export function LudoScreen({
  accessToken,
  myId,
  gameId,
  onBack,
  onOpenGame,
}: {
  accessToken: string;
  myId: string;
  gameId: string | null;
  onBack: () => void;
  onOpenGame: (id: string | null) => void;
}) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 24, MAX_BOARD);
  const [game, setGame] = useState<LudoGame | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [matches, setMatches] = useState<MutualMatchSummary[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [count, setCount] = useState(2);
  const [voice, setVoice] = useState<VoiceRoom | null>(null);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [, force] = useState(0);
  const voiceRef = useRef<VoiceRoom | null>(null);

  useEffect(() => {
    void matchApi
      .getMatches(accessToken)
      .then((r) => setMatches((r.matches as MutualMatchSummary[]) || []))
      .catch(() => undefined);
  }, [accessToken]);

  const load = useCallback(async () => {
    if (!gameId) return setGame(null);
    try {
      setGame(await ludoApi.get(accessToken, gameId));
      VoiceRoom.peek(gameId, setVoiceUsers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the game.");
    }
  }, [accessToken, gameId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live: every move and every join comes over the socket.
  useEffect(() => {
    const socket = getChatSocket();
    if (!socket || !gameId) return;
    const onUpdate = (next: LudoGame) => {
      if (next?.id === gameId) setGame((prev) => (!prev || next.version >= prev.version ? next : prev));
    };
    const onVoice = (data: { gameId: string; users: VoiceUser[] }) => {
      if (data?.gameId === gameId) setVoiceUsers(data.users ?? []);
    };
    socket.on("ludo:update", onUpdate);
    socket.on("ludo:voice", onVoice);
    socket.on("connect", load);
    return () => {
      socket.off("ludo:update", onUpdate);
      socket.off("ludo:voice", onVoice);
      socket.off("connect", load);
    };
  }, [gameId, load]);

  // Leaving the screen turns the mic off.
  useEffect(() => () => voiceRef.current?.stop(), []);

  const run = async (work: () => Promise<LudoGame | void>) => {
    setBusy(true);
    setError("");
    try {
      const next = await work();
      if (next) setGame(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  const joinVoice = async () => {
    if (!gameId) return;
    setVoiceBusy(true);
    setError("");
    try {
      const room = new VoiceRoom(gameId, myId, accessToken, () => {
        setVoiceUsers([...room.users]);
        force((n) => n + 1);
      });
      await room.start();
      voiceRef.current = room;
      setVoice(room);
    } catch (e) {
      setError(e instanceof Error ? (e.name === "NotAllowedError" ? "Allow the microphone to talk." : e.message) : "Could not turn the mic on.");
    } finally {
      setVoiceBusy(false);
    }
  };
  const leaveVoice = () => {
    voiceRef.current?.stop();
    voiceRef.current = null;
    setVoice(null);
  };

  const roll = () =>
    run(async () => {
      setRolling(true);
      try {
        const [next] = await Promise.all([ludoApi.roll(accessToken, gameId!), new Promise((r) => setTimeout(r, 600))]);
        return next as LudoGame;
      } finally {
        setRolling(false);
      }
    });

  const header = (title: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={10}>
        <Ionicons name="chevron-back" size={26} color={palette.ink} />
      </Pressable>
      <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 22, color: palette.ink }}>{title}</Text>
      {game && game.status !== "finished" && game.status !== "cancelled" && game.members.some((m) => m.userId === myId && m.status === "joined") && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave game"
          onPress={() =>
            void run(async () => {
              leaveVoice();
              await ludoApi.leave(accessToken, game.id);
              onBack();
            })
          }
          hitSlop={8}
        >
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#DC2626" }}>Leave</Text>
        </Pressable>
      )}
    </View>
  );

  const errorLine = !!error && (
    <Text accessibilityRole="alert" style={{ marginHorizontal: 16, marginBottom: 8, fontFamily: fonts.body, fontSize: 13, color: "#DC2626" }}>
      {error}
    </Text>
  );

  // ---- New game ----
  if (!gameId) {
    const toggle = (id: string) =>
      setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length >= count - 1 ? list : [...list, id]));
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paperBase }}>
        {header("New Ludo game 🎲")}
        {errorLine}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>How many players?</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[2, 3, 4].map((n) => (
              <PressScale
                key={n}
                accessibilityRole="button"
                accessibilityLabel={`${n} players`}
                accessibilityState={{ selected: count === n }}
                onPress={() => {
                  setCount(n);
                  setPicked((list) => list.slice(0, n - 1));
                }}
                containerStyle={{ flex: 1 }}
                style={{ alignItems: "center", paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: count === n ? palette.crimson : palette.rule, backgroundColor: count === n ? palette.crimsonTint : "#FFFFFF" }}
              >
                <Text style={{ fontFamily: fonts.display, fontSize: 26, color: palette.ink }}>{n}</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>players</Text>
              </PressScale>
            ))}
          </View>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink, marginTop: 6 }}>
            Invite {count - 1} {count - 1 === 1 ? "match" : "matches"} ({picked.length}/{count - 1})
          </Text>
          {matches.length === 0 && (
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>Match with someone first to play together.</Text>
          )}
          {matches.map((m) => {
            const on = picked.includes(m.id);
            return (
              <PressScale
                key={m.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Invite ${m.name}`}
                onPress={() => toggle(m.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: on ? palette.crimson : palette.rule }}
              >
                <Avatar member={{ userId: m.id, name: m.name, photo: m.photo || null, status: "invited", seat: null, color: null }} size={42} />
                <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>{m.name}</Text>
                <Ionicons name={on ? "checkbox" : "square-outline"} size={24} color={on ? palette.crimson : palette.slate} />
              </PressScale>
            );
          })}
          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Create room and invite"
            disabled={busy || picked.length === 0}
            onPress={() =>
              void run(async () => {
                const created = await ludoApi.create(accessToken, count, picked);
                onOpenGame(created.id);
                return created;
              })
            }
            containerStyle={{ marginTop: 10 }}
            style={{ backgroundColor: palette.crimson, borderRadius: radius.pill, paddingVertical: 15, alignItems: "center", opacity: busy || picked.length === 0 ? 0.5 : 1 }}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: "#FFFFFF" }}>Create room & invite</Text>}
          </PressScale>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!game) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paperBase }}>
        {header("Ludo 🎲")}
        {errorLine}
        {!error && <ActivityIndicator color={palette.crimson} style={{ marginTop: 60 }} />}
      </SafeAreaView>
    );
  }

  const me = game.members.find((m) => m.userId === myId);
  const joined = game.members.filter((m) => m.status === "joined");

  // ---- Room (waiting) ----
  if (game.status === "waiting" || game.status === "cancelled") {
    const invitable = matches.filter((m) => !game.members.some((x) => x.userId === m.id && (x.status === "joined" || x.status === "invited")));
    const open = game.maxPlayers - game.members.filter((m) => m.status === "joined" || m.status === "invited").length;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paperBase }}>
        {header(`Ludo room · ${game.maxPlayers} players`)}
        {errorLine}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
          {game.status === "cancelled" && <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: "#DC2626" }}>This room was closed.</Text>}
          {Array.from({ length: game.maxPlayers }, (_, i) => {
            const member = game.members.filter((m) => m.status === "joined" || m.status === "invited")[i];
            return (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.rule }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: SEAT_COLORS[i] }} />
                {member ? <Avatar member={member} size={40} /> : <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderStyle: "dashed", borderColor: palette.rule }} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>
                    {member ? `${member.name}${member.userId === myId ? " (you)" : ""}${member.userId === game.hostId ? " · host" : ""}` : "Open seat"}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: member?.status === "joined" ? "#16A34A" : palette.slate }}>
                    {member ? (member.status === "joined" ? "Ready" : "Invited - waiting to join") : "Invite someone"}
                  </Text>
                </View>
                {(() => {
                  const onMic = voiceUsers.find((v) => v.userId === member?.userId);
                  return onMic ? (
                    <Ionicons accessibilityLabel={onMic.muted ? "Muted" : "On mic"} name={onMic.muted ? "mic-off" : "mic"} size={18} color={onMic.muted ? "#6B7280" : "#16A34A"} />
                  ) : null;
                })()}
              </View>
            );
          })}

          {me?.status === "invited" && game.status === "waiting" && (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <PressScale
                accessibilityRole="button"
                accessibilityLabel="Join game"
                onPress={() => void run(() => ludoApi.join(accessToken, game.id))}
                containerStyle={{ flex: 1 }}
                style={{ backgroundColor: palette.crimson, borderRadius: radius.pill, paddingVertical: 14, alignItems: "center" }}
              >
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: "#FFFFFF" }}>Join game</Text>
              </PressScale>
              <PressScale
                accessibilityRole="button"
                accessibilityLabel="Decline"
                onPress={() =>
                  void run(async () => {
                    await ludoApi.decline(accessToken, game.id);
                    onBack();
                  })
                }
                containerStyle={{ flex: 1 }}
                style={{ borderWidth: 1.5, borderColor: palette.rule, borderRadius: radius.pill, paddingVertical: 14, alignItems: "center" }}
              >
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>Not now</Text>
              </PressScale>
            </View>
          )}

          {me?.status === "joined" && game.status === "waiting" && (
            <VoiceBar room={voice} users={voiceUsers} onJoin={() => void joinVoice()} onLeave={leaveVoice} busy={voiceBusy} />
          )}

          {game.isHost && game.status === "waiting" && open > 0 && invitable.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>Invite more ({open} open)</Text>
              {invitable.slice(0, 20).map((m) => (
                <PressScale
                  key={m.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Invite ${m.name}`}
                  onPress={() => void run(() => ludoApi.invite(accessToken, game.id, [m.id]))}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 12, backgroundColor: "#FFFFFF" }}
                >
                  <Avatar member={{ userId: m.id, name: m.name, photo: m.photo || null, status: "invited", seat: null, color: null }} size={34} />
                  <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: palette.ink }}>{m.name}</Text>
                  <Ionicons name="person-add-outline" size={18} color={palette.crimson} />
                </PressScale>
              ))}
            </View>
          )}

          {game.isHost && game.status === "waiting" && (
            <PressScale
              accessibilityRole="button"
              accessibilityLabel="Start game"
              disabled={busy || joined.length < 2}
              onPress={() => void run(() => ludoApi.start(accessToken, game.id))}
              style={{ backgroundColor: "#16A34A", borderRadius: radius.pill, paddingVertical: 15, alignItems: "center", opacity: busy || joined.length < 2 ? 0.5 : 1 }}
            >
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: "#FFFFFF" }}>
                {joined.length < 2 ? "Waiting for players to join..." : `Start game with ${joined.length} players`}
              </Text>
            </PressScale>
          )}
          {!game.isHost && me?.status === "joined" && game.status === "waiting" && (
            <Text style={{ textAlign: "center", fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>Waiting for the host to start...</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- The game ----
  const state = game.state!;
  const turnMember = game.members.find((m) => m.userId === state.turnUserId);
  const myTurn = state.turnUserId === myId;
  const last = state.last;
  const lastName = last ? game.members.find((m) => m.userId === last.userId)?.name ?? "" : "";
  const lastText = !last
    ? ""
    : last.type === "no_move"
      ? `${lastName} rolled ${last.dice} - no move`
      : last.type === "three_sixes"
        ? `${lastName} rolled three 6s - turn lost`
        : last.type === "move" && last.cut.length
          ? `${lastName} cut ${last.cut.map((c) => game.members.find((m) => m.userId === c.userId)?.name).join(", ")}! ✂️`
          : last.type === "move" && last.to === 56
            ? `${lastName} got a token home! 🏠`
            : last.type === "left"
              ? `${lastName} left the game`
              : "";
  const amPlaying = state.players.some((p) => p.userId === myId && !p.out);
  const winner = game.members.find((m) => m.userId === state.winner);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.paperBase }}>
      {header("Ludo 🎲")}
      {errorLine}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 30, gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <PlayerChip game={game} seat={0} voice={voiceUsers} />
          <PlayerChip game={game} seat={1} voice={voiceUsers} />
        </View>
        <Board game={game} myId={myId} size={boardSize} onMove={(token) => void run(() => ludoApi.move(accessToken, game.id, token))} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <PlayerChip game={game} seat={3} voice={voiceUsers} />
          <PlayerChip game={game} seat={2} voice={voiceUsers} />
        </View>

        {!state.finished && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 12, borderWidth: 1, borderColor: palette.rule }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={myTurn && !state.rolled ? "Roll the dice" : `Dice ${state.dice ?? ""}`}
              disabled={!myTurn || state.rolled || busy}
              onPress={() => void roll()}
            >
              <Dice value={state.dice} rolling={rolling} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>
                {myTurn ? (state.rolled ? "Tap a glowing token to move" : "Your turn - tap the dice") : `${turnMember?.name ?? "..."} is playing`}
              </Text>
              {!!lastText && <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate, marginTop: 2 }}>{lastText}</Text>}
            </View>
          </View>
        )}

        {amPlaying && !state.finished && (
          <VoiceBar room={voice} users={voiceUsers} onJoin={() => void joinVoice()} onLeave={leaveVoice} busy={voiceBusy} />
        )}

        {state.finished && (
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, gap: 10, alignItems: "center", borderWidth: 1, borderColor: palette.rule }}>
            <Text style={{ fontSize: 40 }}>🏆</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 24, color: palette.ink }}>
              {state.winner === myId ? "You won!" : `${winner?.name ?? "Someone"} won!`}
            </Text>
            {state.places.map((id, i) => (
              <Text key={id} style={{ fontFamily: fonts.body, fontSize: 14, color: palette.inkSoft }}>
                {["🥇", "🥈", "🥉", "4th"][i]} {game.members.find((m) => m.userId === id)?.name}
              </Text>
            ))}
            {game.isHost && (
              <PressScale
                accessibilityRole="button"
                accessibilityLabel="Play again"
                onPress={() =>
                  void run(async () => {
                    const others = state.players.map((p) => p.userId).filter((id) => id !== myId);
                    const again = await ludoApi.create(accessToken, game.maxPlayers, others);
                    onOpenGame(again.id);
                  })
                }
                style={{ marginTop: 6, backgroundColor: palette.crimson, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 24 }}
              >
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: "#FFFFFF" }}>Play again</Text>
              </PressScale>
            )}
          </View>
        )}
      </ScrollView>
      {state.finished && <Confetti />}
    </SafeAreaView>
  );
}
