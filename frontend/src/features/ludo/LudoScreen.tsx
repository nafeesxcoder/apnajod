/**
 * Ludo for 2 to 4 players, with live voice and game sounds.
 *
 * - New game: pick 2, 3 or 4 players and invite matches.
 * - Room: who joined, who is still invited; the host starts once two are in.
 * - Game: a gold-framed board, a 3D dice (rolled on the server), tokens
 *   that hop square by square, a ring-of-dots clock on each turn, big
 *   "CUT!" / "HOME!" / "SIX!" moments, sounds with a volume control, and
 *   the results with a podium.
 * - Voice: turn the mic on to talk to everyone in the game, mute, speaker.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, Vibration, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { type LudoGame, ludoApi } from "../../api/ludoApi";
import { matchApi, type MutualMatchSummary } from "../../api/matchApi";
import { getChatSocket } from "../../api/chatSocket";
import { fonts } from "../../theme";
import { SEAT_COLORS } from "./board";
import { LudoBoard } from "./LudoBoard";
import { Avatar, Banner, Confetti, Dice, GoldButton, NightBackground, PlayerCard, SoundButton, SoundPanel, VoiceBar } from "./LudoBits";
import { type LudoBanner, ludoChange } from "./ludoEvents";
import { ludoSound } from "./ludoSound";
import { filterInvitees } from "./ludoText";
import { L, setActiveTheme } from "./ludoTheme";
import { allowedPrefs, BOARD_THEMES, DEFAULT_PREFS, DICE_SKINS, stepMs, TOKEN_STYLES } from "./ludoLooks";
import { CoinChip, LudoStore, useLudoPrefs, useWallet } from "./LudoStore";
import { showDailySpin } from "./DailySpin";
import { coinsApi, type LeaderRow } from "../../api/coinsApi";
import { walletStore } from "./walletStore";
import { VoiceRoom, type VoiceUser } from "./voiceRoom";

const MAX_BOARD = 440;

function lastLine(game: LudoGame, myId: string) {
  const last = game.state?.last;
  if (!last) return "";
  const who = last.userId === myId ? "You" : game.members.find((m) => m.userId === last.userId)?.name ?? "";
  if (last.type === "no_move") return `${who} rolled ${last.dice} - no move`;
  if (last.type === "three_sixes") return `${who} rolled three 6s - turn lost`;
  if (last.type === "roll") return `${who} rolled ${last.dice}`;
  if (last.type === "left") return `${who} left the game`;
  if (last.type !== "move") return "";
  if (last.cut.length) return `${who} cut ${last.cut.map((c) => (c.userId === myId ? "you" : game.members.find((m) => m.userId === c.userId)?.name)).join(", ")}! ✂️`;
  if (last.to === 56) return `${who} got a token home! 🏠`;
  if (last.from === -1) return `${who} brought a token out`;
  return `${who} moved ${last.dice}`;
}

import { OnlineDot } from "../social/OnlineDot";
import { useOnlineIds } from "../social/useOnlineIds";

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
  const [search, setSearch] = useState("");
  const [voice, setVoice] = useState<VoiceRoom | null>(null);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [banner, setBanner] = useState<{ banner: LudoBanner; stamp: number } | null>(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [reactOpen, setReactOpen] = useState(false);
  const [reactions, setReactions] = useState<Record<string, { value: string; kind: "emoji" | "chat"; stamp: number }>>({});
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  // Settings: only what you have unlocked is used.
  const wallet = useWallet(accessToken);
  const online = useOnlineIds(accessToken, game?.members.map((m) => m.userId) ?? []);
  const rawPrefs = useLudoPrefs();
  const prefs = wallet ? allowedPrefs(rawPrefs, wallet.unlocked) : DEFAULT_PREFS;
  const theme = BOARD_THEMES[prefs.theme]!;
  setActiveTheme(theme);
  useEffect(() => {
    ludoSound.setPack(prefs.sound);
  }, [prefs.sound]);
  const buzz = (ms: number) => {
    if (prefs.vibrate) Vibration.vibrate(ms);
  };
  const [, force] = useState(0);
  const voiceRef = useRef<VoiceRoom | null>(null);
  const seenRef = useRef<LudoGame | null>(null);

  useEffect(() => {
    void ludoSound.load();
    ludoSound.warm();
    return () => ludoSound.release();
  }, []);

  useEffect(() => {
    if (!gameId) void coinsApi.leaderboard(accessToken).then(setLeaders).catch(() => undefined);
  }, [accessToken, gameId]);

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
    seenRef.current = null;
    setSearch("");
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
    const onReact = (data: { gameId: string; from: string; kind: "emoji" | "chat"; value: string }) => {
      if (data?.gameId !== gameId) return;
      setReactions((all) => ({ ...all, [data.from]: { value: data.value, kind: data.kind, stamp: Date.now() } }));
      if (data.from !== myId) ludoSound.play("step");
    };
    socket.on("ludo:update", onUpdate);
    socket.on("ludo:voice", onVoice);
    socket.on("ludo:react", onReact);
    socket.on("connect", load);
    return () => {
      socket.off("ludo:update", onUpdate);
      socket.off("ludo:voice", onVoice);
      socket.off("ludo:react", onReact);
      socket.off("connect", load);
    };
  }, [gameId, load]);

  // Sounds and the big word for whatever just happened.
  useEffect(() => {
    if (!game || game.id !== gameId) return;
    const prev = seenRef.current && seenRef.current.id === game.id ? seenRef.current : null;
    seenRef.current = game;
    if (!prev) return;
    const { sounds, banner: next } = ludoChange(prev, game, myId);
    sounds.forEach((name, i) => setTimeout(() => ludoSound.play(name), i * 160));
    if (sounds.includes("turn")) buzz(40);
    if (sounds.includes("cut")) buzz(120);
    // The game just ended: coins may have come in.
    if (game.state?.finished && !prev.state?.finished) setTimeout(() => void walletStore.refresh(accessToken), 600);
    if (next) setBanner({ banner: next, stamp: Date.now() });
  }, [game, gameId, myId]);

  // The last five seconds of my turn tick.
  const myTurnNow = game?.status === "playing" && game.state?.turnUserId === myId;
  useEffect(() => {
    if (!myTurnNow || !game?.turnDeadline) return;
    const deadline = new Date(game.turnDeadline).getTime();
    const timer = setInterval(() => {
      const left = deadline - Date.now();
      if (left > 0 && left <= 5200) ludoSound.play("tick");
    }, 1000);
    return () => clearInterval(timer);
  }, [myTurnNow, game?.turnDeadline]);

  // Leaving the screen, or moving to another game, turns the mic off.
  useEffect(
    () => () => {
      voiceRef.current?.stop();
      voiceRef.current = null;
      setVoice(null);
    },
    [gameId],
  );

  const run = async (work: () => Promise<LudoGame | void>) => {
    setBusy(true);
    setError("");
    try {
      const next = await work();
      if (next) setGame((prev) => (!prev || prev.id !== next.id || next.version >= prev.version ? next : prev));
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
      ludoSound.play("dice");
      try {
        const [next] = await Promise.all([ludoApi.roll(accessToken, gameId!), new Promise((r) => setTimeout(r, 650))]);
        return next as LudoGame;
      } finally {
        setRolling(false);
      }
    });

  const searchBox = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, height: 46, borderRadius: 23, backgroundColor: L.glassStrong, borderWidth: 1, borderColor: L.glassBorder }}>
      <Ionicons name="search" size={18} color={L.textSoft} />
      <TextInput
        accessibilityLabel="Search people to invite"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name or @username"
        placeholderTextColor={L.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        style={[{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: L.text, paddingVertical: 0 }, Platform.OS === "web" ? ({ outlineStyle: "none" } as never) : null]}
      />
      {!!search && (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch("")} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={L.textSoft} />
        </Pressable>
      )}
    </View>
  );
  const noneFound = (
    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: L.textSoft, textAlign: "center", paddingVertical: 8 }}>No one called "{search.trim()}" in your matches.</Text>
  );

  const header = (title: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={10} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: L.glassStrong, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="chevron-back" size={22} color={L.text} />
      </Pressable>
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.display, fontSize: 21, color: L.text }}>
        {title}
      </Text>
      <CoinChip coins={wallet?.coins} onPress={() => setStoreOpen(true)} />
      <Pressable accessibilityRole="button" accessibilityLabel="Ludo settings and store" onPress={() => setStoreOpen(true)} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: L.glassStrong, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="settings-sharp" size={18} color={L.text} />
      </Pressable>
      <SoundButton onPress={() => setSoundOpen((v) => !v)} />
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
          style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "rgba(244,63,94,0.6)", alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: "#FDA4AF" }}>Leave</Text>
        </Pressable>
      )}
    </View>
  );

  const errorLine = !!error && (
    <Text accessibilityRole="alert" style={{ marginHorizontal: 16, marginBottom: 8, fontFamily: fonts.bodySemi, fontSize: 13, color: "#FDA4AF" }}>
      {error}
    </Text>
  );

  const shell = (title: string, body: React.ReactNode, overlay?: React.ReactNode) => (
    <View style={{ flex: 1, backgroundColor: L.bgMid }}>
      <NightBackground />
      <SafeAreaView style={{ flex: 1 }}>
        {header(title)}
        {errorLine}
        {body}
        {soundOpen && <SoundPanel onClose={() => setSoundOpen(false)} />}
        <LudoStore visible={storeOpen} accessToken={accessToken} onClose={() => setStoreOpen(false)} />
      </SafeAreaView>
      {overlay}
    </View>
  );

  const glassRow = { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, padding: 12, borderRadius: 18, backgroundColor: L.glass, borderWidth: 1, borderColor: L.glassBorder };

  // ---- New game ----
  if (!gameId) {
    const toggle = (id: string) =>
      setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length >= count - 1 ? list : [...list, id]));
    const createAndInvite = () =>
      void run(async () => {
        const created = await ludoApi.create(accessToken, count, picked);
        onOpenGame(created.id);
        return created;
      });
    const inviteLabel = picked.length === 0 ? "Pick who to invite" : `Create room & invite ${picked.length}`;
    return shell(
      "Ludo",
      <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}>
        <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
          <View style={{ width: 84, height: 84, borderRadius: 22, overflow: "hidden", flexDirection: "row", flexWrap: "wrap", transform: [{ rotate: "-10deg" }], borderWidth: 3, borderColor: L.gold }}>
            {SEAT_COLORS.map((c) => (
              <View key={c} style={{ width: 39, height: 39, backgroundColor: c, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF" }} />
              </View>
            ))}
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, color: L.text, marginTop: 8 }}>Play Ludo together</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: L.textSoft }}>Talk live on mic while you play 🎙️</Text>
        </View>

        {wallet && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Open the Ludo store" onPress={() => setStoreOpen(true)} style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: L.glass, borderWidth: 1, borderColor: L.glassBorder, gap: 2 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 20, color: L.gold }}>{wallet.coins} coins</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: L.textSoft }}>
                {wallet.level} · {wallet.wins} wins{wallet.streak > 1 ? ` · 🔥${wallet.streak}` : ""}
              </Text>
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: L.text, marginTop: 4 }}>🛍️ Store & settings ›</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={wallet.canSpin ? "Daily spin is ready" : "Daily spin"}
              onPress={() => showDailySpin()}
              style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: wallet.canSpin ? "rgba(246,196,69,0.16)" : L.glass, borderWidth: 1, borderColor: wallet.canSpin ? L.gold : L.glassBorder, gap: 2 }}
            >
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 20, color: L.text }}>🎡 Spin</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: wallet.canSpin ? L.gold : L.textSoft }}>
                {wallet.canSpin ? "Ready! Tap to spin" : `Next at ${new Date(wallet.spinReadyAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
              </Text>
            </Pressable>
          </View>
        )}

        {leaders.length > 0 && (
          <View style={{ padding: 12, borderRadius: 18, backgroundColor: L.glass, borderWidth: 1, borderColor: L.glassBorder, gap: 8 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: L.text }}>🏆 This week's top players</Text>
            {leaders.slice(0, 5).map((row) => (
              <View key={row.userId} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ width: 24, fontFamily: fonts.bodyBold, fontSize: 14, color: row.rank <= 3 ? L.gold : L.textSoft }}>{["🥇", "🥈", "🥉"][row.rank - 1] ?? row.rank}</Text>
                <Avatar member={{ name: row.name, photo: row.photo }} size={30} />
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: row.me ? fonts.bodyBold : fonts.bodySemi, fontSize: 14, color: L.text }}>
                  {row.me ? "You" : row.name}
                </Text>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: L.gold }}>{row.coins} coins</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: L.text }}>How many players?</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[2, 3, 4].map((n) => {
            const on = count === n;
            return (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityLabel={`${n} players`}
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setCount(n);
                  setPicked((list) => list.slice(0, n - 1));
                }}
                style={{ flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 18, borderWidth: 2, borderColor: on ? L.gold : L.glassBorder, backgroundColor: on ? "rgba(246,196,69,0.14)" : L.glass }}
              >
                <View style={{ flexDirection: "row", gap: 3, marginBottom: 6 }}>
                  {SEAT_COLORS.slice(0, n).map((c) => (
                    <View key={c} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c, borderWidth: 1.5, borderColor: "#FFFFFF" }} />
                  ))}
                </View>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 24, color: L.text }}>{n}</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: L.textSoft }}>players</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: L.text, marginTop: 6 }}>
          Invite {count - 1} {count - 1 === 1 ? "match" : "matches"} ({picked.length}/{count - 1})
        </Text>
        {matches.length === 0 && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: L.textSoft }}>Match with someone first to play together.</Text>}
        {matches.length > 0 && searchBox}
        {!!search.trim() && filterInvitees(matches, search).length === 0 && noneFound}
        {[
          // Whoever is already picked stays in view while you search.
          ...matches.filter((m) => picked.includes(m.id) && !filterInvitees([m], search).length),
          ...filterInvitees(matches, search),
        ].map((m) => {
          const on = picked.includes(m.id);
          return (
            <Pressable
              key={m.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`Invite ${m.name}`}
              onPress={() => toggle(m.id)}
              style={[glassRow, on && { borderColor: L.gold, backgroundColor: "rgba(246,196,69,0.12)" }]}
            >
              <Avatar member={{ name: m.name, photo: m.photo || null }} size={44} />
              <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: L.text }}>{m.name}</Text>
              {on ? (
                // The invite is sent from the row you picked - no scrolling
                // past the whole list to find the button.
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={picked.length > 1 ? `Invite ${picked.length} picked` : `Invite ${m.name} now`}
                  disabled={busy}
                  onPress={createAndInvite}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: L.gold, opacity: busy ? 0.6 : 1 }}
                >
                  {busy ? <ActivityIndicator size="small" color="#8A1A47" /> : <Ionicons name="paper-plane" size={15} color="#8A1A47" />}
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: "#8A1A47" }}>{picked.length > 1 ? `Invite ${picked.length}` : "Invite"}</Text>
                </Pressable>
              ) : (
                <Ionicons name="ellipse-outline" size={26} color={L.textMuted} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Always on screen, however long the list is. */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: L.glassBorder, backgroundColor: L.bgMid }}>
        <GoldButton
          label={inviteLabel}
          accessibilityLabel={picked.length === 0 ? "Pick who to invite" : "Create room and invite"}
          disabled={picked.length === 0}
          busy={busy}
          onPress={createAndInvite}
        />
      </View>
      </View>,
    );
  }

  if (!game) {
    return shell("Ludo", !error ? <Text style={{ textAlign: "center", marginTop: 60, fontFamily: fonts.body, color: L.textSoft }}>Opening the game...</Text> : null);
  }

  const me = game.members.find((m) => m.userId === myId);
  const joined = game.members.filter((m) => m.status === "joined");

  // ---- Room (waiting) ----
  if (game.status === "waiting" || game.status === "cancelled") {
    const invitable = matches.filter((m) => !game.members.some((x) => x.userId === m.id && (x.status === "joined" || x.status === "invited")));
    const seated = game.members.filter((m) => m.status === "joined" || m.status === "invited");
    const open = game.maxPlayers - seated.length;
    return shell(
      `${game.maxPlayers}-player room`,
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {game.status === "cancelled" && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#FDA4AF" }}>This room was closed.</Text>}
        {Array.from({ length: game.maxPlayers }, (_, i) => {
          const member = seated[i];
          const onMic = voiceUsers.find((v) => v.userId === member?.userId);
          return (
            <View key={i} style={[glassRow, { borderLeftWidth: 5, borderLeftColor: SEAT_COLORS[i] }]}>
              {member ? (
                <View>
                  <Avatar member={member} size={44} ring={SEAT_COLORS[i]} />
                  {online[member.userId] && <OnlineDot size={12} />}
                </View>
              ) : <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderStyle: "dashed", borderColor: L.textMuted }} />}
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: L.text }}>
                  {member ? `${member.name}${member.userId === myId ? " (you)" : ""}${member.userId === game.hostId ? " · host" : ""}` : "Open seat"}
                </Text>
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: member?.status === "joined" ? "#86EFAC" : L.textSoft }}>
                  {member ? (member.status === "joined" ? "Ready" : "Invited - waiting to join") : "Invite someone"}
                </Text>
              </View>
              {onMic && <Ionicons accessibilityLabel={onMic.muted ? "Muted" : "On mic"} name={onMic.muted ? "mic-off" : "mic"} size={18} color={onMic.muted ? L.textMuted : L.green} />}
            </View>
          );
        })}

        {me?.status === "invited" && game.status === "waiting" && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <GoldButton label="Join game" tone="green" onPress={() => void run(() => ludoApi.join(accessToken, game.id))} busy={busy} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decline"
              onPress={() =>
                void run(async () => {
                  await ludoApi.decline(accessToken, game.id);
                  onBack();
                })
              }
              style={{ flex: 1, borderWidth: 1.5, borderColor: L.glassBorder, borderRadius: 999, paddingVertical: 14, alignItems: "center" }}
            >
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: L.text }}>Not now</Text>
            </Pressable>
          </View>
        )}

        {me?.status === "joined" && game.status === "waiting" && <VoiceBar room={voice} users={voiceUsers} onJoin={() => void joinVoice()} onLeave={leaveVoice} busy={voiceBusy} />}

        {game.isHost && game.status === "waiting" && open > 0 && invitable.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: L.text }}>Invite more ({open} open)</Text>
            {invitable.length > 5 && searchBox}
            {!!search.trim() && filterInvitees(invitable, search).length === 0 && noneFound}
            {filterInvitees(invitable, search).slice(0, 50).map((m) => (
              <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`Invite ${m.name}`} onPress={() => void run(() => ludoApi.invite(accessToken, game.id, [m.id]))} style={[glassRow, { padding: 9 }]}>
                <Avatar member={{ name: m.name, photo: m.photo || null }} size={36} />
                <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: L.text }}>{m.name}</Text>
                <Ionicons name="person-add" size={18} color={L.gold} />
              </Pressable>
            ))}
          </View>
        )}

        {game.isHost && game.status === "waiting" && (
          <GoldButton
            tone="green"
            accessibilityLabel="Start game"
            label={joined.length < 2 ? "Waiting for players to join..." : `Start game with ${joined.length} players`}
            disabled={joined.length < 2}
            busy={busy}
            onPress={() => void run(() => ludoApi.start(accessToken, game.id))}
          />
        )}
        {!game.isHost && me?.status === "joined" && game.status === "waiting" && (
          <Text style={{ textAlign: "center", fontFamily: fonts.body, fontSize: 13, color: L.textSoft }}>Waiting for the host to start...</Text>
        )}
      </ScrollView>,
    );
  }

  // ---- The game ----
  const state = game.state!;
  const turnMember = game.members.find((m) => m.userId === state.turnUserId);
  const turnSeat = state.players.find((p) => p.userId === state.turnUserId)?.seat ?? 0;
  const myTurn = state.turnUserId === myId;
  const canRoll = myTurn && !state.rolled && !busy;
  const amPlaying = state.players.some((p) => p.userId === myId && !p.out);
  const winner = game.members.find((m) => m.userId === state.winner);

  const results = state.finished && (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 85, backgroundColor: "rgba(8,4,24,0.82)", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <LinearGradient colors={["#3A1F86", "#1E0F4D"]} style={{ width: "100%", maxWidth: 380, borderRadius: 28, padding: 22, alignItems: "center", gap: 10, borderWidth: 2, borderColor: L.gold }}>
        <Text style={{ fontSize: 56 }}>🏆</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 28, color: L.gold }}>{state.winner === myId ? "You won!" : `${winner?.name ?? "Someone"} won!`}</Text>
        {(() => {
          const mine = state.rewards?.[myId];
          if (!mine) return null;
          return (
            <View style={{ alignItems: "center", gap: 2 }}>
              <Text accessibilityLabel={`You earned ${mine.coins} coins`} style={{ fontFamily: fonts.bodyBold, fontSize: 26, color: "#FFFFFF" }}>
                {mine.coins > 0 ? `+${mine.coins} coins` : "Daily coin limit reached"}
              </Text>
              {(mine.notes ?? []).map((note) => (
                <Text key={note} style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: L.gold }}>
                  {note}
                </Text>
              ))}
            </View>
          );
        })()}
        <View style={{ width: "100%", gap: 8, marginTop: 6 }}>
          {state.places.map((id, i) => {
            const m = game.members.find((x) => x.userId === id);
            const seat = state.players.find((p) => p.userId === id)?.seat ?? 0;
            return (
              <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 16, backgroundColor: i === 0 ? "rgba(246,196,69,0.16)" : L.glass }}>
                <Text style={{ fontSize: 22, width: 30, textAlign: "center" }}>{["🥇", "🥈", "🥉", "4"][i]}</Text>
                <Avatar member={m} size={38} ring={SEAT_COLORS[seat]} />
                <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: L.text }}>{id === myId ? "You" : m?.name}</Text>
              </View>
            );
          })}
        </View>
        <View style={{ width: "100%", gap: 10, marginTop: 10 }}>
          {game.isHost && (
            <GoldButton
              label="Play again"
              busy={busy}
              onPress={() =>
                void run(async () => {
                  const others = state.players.map((p) => p.userId).filter((id) => id !== myId);
                  const again = await ludoApi.create(accessToken, game.maxPlayers, others);
                  onOpenGame(again.id);
                })
              }
            />
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Back to games" onPress={onBack} style={{ paddingVertical: 12, alignItems: "center" }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: L.textSoft }}>Back</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );

  return shell(
    "Ludo",
    <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 30, gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <PlayerCard game={game} seat={0} voice={voiceUsers} myId={myId} reaction={reactions[state.players.find((p) => p.seat === 0)?.userId ?? ""] ?? null} />
        <PlayerCard game={game} seat={1} voice={voiceUsers} myId={myId} flip reaction={reactions[state.players.find((p) => p.seat === 1)?.userId ?? ""] ?? null} />
      </View>
      <View>
        <LudoBoard
          game={game}
          myId={myId}
          size={boardSize}
          onMove={(token) => void run(() => ludoApi.move(accessToken, game.id, token))}
          onStep={() => ludoSound.play("step")}
          theme={theme}
          tokenStyle={TOKEN_STYLES[prefs.token]!}
          stepMs={stepMs(prefs.speed)}
        />
        <Banner banner={banner?.banner ?? null} stamp={banner?.stamp ?? 0} />
        {/* A token got home: a little confetti over the board, never in the way. */}
        {banner?.banner.kind === "home" && <Confetti key={banner.stamp} />}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <PlayerCard game={game} seat={3} voice={voiceUsers} myId={myId} reaction={reactions[state.players.find((p) => p.seat === 3)?.userId ?? ""] ?? null} />
        <PlayerCard game={game} seat={2} voice={voiceUsers} myId={myId} flip reaction={reactions[state.players.find((p) => p.seat === 2)?.userId ?? ""] ?? null} />
      </View>

      {!state.finished && (
        <LinearGradient
          colors={[`${SEAT_COLORS[turnSeat]}55`, "rgba(255,255,255,0.05)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flexDirection: "row", alignItems: "center", gap: 16, borderRadius: 22, padding: 14, borderWidth: 1.5, borderColor: myTurn ? L.gold : L.glassBorder }}
        >
          <Pressable accessibilityRole="button" accessibilityLabel={canRoll ? "Roll the dice" : `Dice ${state.dice ?? ""}`} disabled={!canRoll} onPress={() => void roll()} hitSlop={10}>
            <Dice value={state.dice} rolling={rolling} live={canRoll} skin={DICE_SKINS[prefs.dice]} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: myTurn ? L.gold : L.text }}>
              {myTurn ? (state.rolled ? "Tap a glowing token" : "Your turn - tap the dice!") : `${turnMember?.name ?? "..."} is playing`}
            </Text>
            <Text numberOfLines={2} style={{ fontFamily: fonts.body, fontSize: 13, color: L.textSoft, marginTop: 2 }}>
              {lastLine(game, myId)}
            </Text>
          </View>
          {amPlaying && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send an emoji or a quick message"
              onPress={() => setReactOpen((v) => !v)}
              hitSlop={8}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: reactOpen ? L.gold : L.glassStrong, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 20 }}>😊</Text>
            </Pressable>
          )}
        </LinearGradient>
      )}

      {reactOpen && amPlaying && !state.finished && wallet && (
        <View style={{ borderRadius: 18, padding: 10, gap: 8, backgroundColor: L.glass, borderWidth: 1, borderColor: L.glassBorder }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
            {wallet.catalog
              .filter((item) => item.kind === "emoji" && wallet.unlocked.includes(item.key))
              .flatMap((item) => item.items ?? [])
              .map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`Send ${value}`}
                  onPress={() => {
                    getChatSocket()?.emit("ludo:react", { gameId: game.id, kind: "emoji", value });
                    setReactOpen(false);
                  }}
                  style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 28 }}>{value}</Text>
                </Pressable>
              ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {wallet.catalog
              .filter((item) => item.kind === "chat" && wallet.unlocked.includes(item.key))
              .flatMap((item) => item.items ?? [])
              .map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`Send ${value}`}
                  onPress={() => {
                    getChatSocket()?.emit("ludo:react", { gameId: game.id, kind: "chat", value });
                    setReactOpen(false);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: L.glassStrong }}
                >
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: L.text }}>{value}</Text>
                </Pressable>
              ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Get more emoji and messages" onPress={() => setStoreOpen(true)} style={{ alignSelf: "center", paddingVertical: 4 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12.5, color: L.gold }}>🔓 More in the store</Text>
          </Pressable>
        </View>
      )}

      {amPlaying && !state.finished && <VoiceBar room={voice} users={voiceUsers} onJoin={() => void joinVoice()} onLeave={leaveVoice} busy={voiceBusy} />}
    </ScrollView>,
    <>
      {results}
      {state.finished && <Confetti />}
    </>,
  );
}
