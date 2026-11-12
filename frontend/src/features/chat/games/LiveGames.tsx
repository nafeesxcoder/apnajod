import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  gamesApi,
  type GameKind,
  type GameView,
  type KnowMeQuestion,
} from "../../../api/gamesApi";
import { fonts, palette, radius } from "../../../theme";

/**
 * Games two matched people play inside their chat.
 *
 * The server keeps the state and the hidden answers; these screens only
 * draw what it sends and send moves back. Nothing is bet or won.
 */
export const LIVE_GAMES: { kind: GameKind; emoji: string; title: string; blurb: string }[] = [
  { kind: "this_or_that", emoji: "🔀", title: "This or That", blurb: "5 quick picks. See how alike you are." },
  { kind: "know_me", emoji: "🧠", title: "How well do you know me", blurb: "Answer 5 about yourself. They guess." },
  { kind: "would_you_rather", emoji: "🤔", title: "Would you rather", blurb: "3 big choices, revealed together." },
  { kind: "tic_tac_toe", emoji: "⭕", title: "Tic-tac-toe", blurb: "The classic. You go first." },
];

const POLL_MS = 2500;

/* ---------------- shared bits ---------------- */

function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // A centred dialog on a laptop; a bottom sheet on a phone.
  const { width, height } = useWindowDimensions();
  const centred = width >= 700;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close"
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: centred ? "center" : "flex-end",
          alignItems: "center",
          padding: centred ? 24 : 0,
        }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            width: "100%",
            maxWidth: 460,
            maxHeight: height * (centred ? 0.85 : 0.9),
            backgroundColor: palette.paper,
            borderRadius: centred ? radius.xl : 0,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 8,
            }}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: 20, color: palette.ink, flex: 1 }}>
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={palette.slate} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12 }}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={off}
      onPress={onPress}
      style={{
        backgroundColor: off ? palette.rule : palette.navy,
        borderRadius: radius.pill,
        paddingVertical: 13,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        marginTop: 4,
      }}
    >
      {busy && <ActivityIndicator color="#FFFFFF" size="small" />}
      <Text style={{ color: "#FFFFFF", fontFamily: fonts.bodySemi, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

function Choice({
  label,
  selected,
  onPress,
  tone,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Result colouring: right / wrong / neutral. */
  tone?: "right" | "wrong";
}) {
  const border = tone === "right" ? palette.emerald : tone === "wrong" ? palette.crimson : selected ? palette.navy : palette.rule;
  const background = selected ? palette.paperCool : palette.paper;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 44,
        borderRadius: radius.md,
        borderWidth: selected || tone ? 2 : 1,
        borderColor: border,
        backgroundColor: background,
        paddingHorizontal: 10,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: selected ? fonts.bodySemi : fonts.body,
          fontSize: 14,
          color: palette.ink,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate, textAlign: "center" }}>
      {children}
    </Text>
  );
}

/* ---------------- picker section (inside the Games sheet) ---------------- */

export function LiveGamesSection({ onPick }: { onPick: (kind: GameKind) => void }) {
  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.slate, letterSpacing: 0.4 }}>
        PLAY TOGETHER
      </Text>
      {LIVE_GAMES.map((game) => (
        <Pressable
          key={game.kind}
          accessibilityRole="button"
          accessibilityLabel={`Play ${game.title}`}
          onPress={() => onPick(game.kind)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 12,
            borderRadius: radius.md,
            backgroundColor: pressed ? palette.paperCool : palette.paperSand,
          })}
        >
          <Text style={{ fontSize: 26 }}>{game.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>{game.title}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>{game.blurb}</Text>
          </View>
          <Ionicons name="play-circle" size={24} color={palette.navy} />
        </Pressable>
      ))}
      <Text
        style={{
          fontFamily: fonts.bodySemi,
          fontSize: 13,
          color: palette.slate,
          letterSpacing: 0.4,
          marginTop: 8,
        }}
      >
        CONVERSATION CARDS
      </Text>
    </View>
  );
}

/* ---------------- the card in the chat ---------------- */

export function LiveGameCard({
  game,
  mine,
  onOpen,
}: {
  game: { id: string; kind: string; title: string; emoji: string; result: string | null };
  mine: boolean;
  onOpen?: () => void;
}) {
  const ink = mine ? "#FFFFFF" : palette.ink;
  const soft = mine ? "rgba(255,255,255,0.8)" : palette.slate;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={game.result ? `${game.title} result: ${game.result}` : `Open ${game.title}`}
      onPress={onOpen}
      disabled={!onOpen}
      style={{ minWidth: 200, gap: 6, paddingVertical: 2 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 24 }}>{game.emoji}</Text>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: ink, flexShrink: 1 }}>
          {game.title}
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: ink }}>
        {game.result ? game.result : mine ? "You started a game" : "Wants to play with you!"}
      </Text>
      {!!onOpen && (
        <View
          style={{
            alignSelf: "flex-start",
            borderRadius: radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 5,
            backgroundColor: mine ? "rgba(255,255,255,0.18)" : palette.paperSand,
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: mine ? "#FFFFFF" : palette.navy }}>
            {game.result ? "See answers" : "Open game"}
          </Text>
        </View>
      )}
      {!onOpen && <Text style={{ fontSize: 12, color: soft }}>Open on the app to play</Text>}
    </Pressable>
  );
}

/* ---------------- How well do you know me: the starter's setup ---------------- */

export function KnowMeSetupSheet({
  visible,
  accessToken,
  partnerName,
  onClose,
  onStart,
}: {
  visible: boolean;
  accessToken: string;
  partnerName: string;
  onClose: () => void;
  onStart: (setup: { questions: number[]; answers: number[] }) => Promise<void>;
}) {
  const [questions, setQuestions] = useState<KnowMeQuestion[] | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    let live = true;
    setQuestions(null);
    setError("");
    gamesApi
      .knowMeQuestions(accessToken)
      .then((qs) => {
        if (!live) return;
        setQuestions(qs);
        setAnswers(qs.map(() => null));
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not load questions."));
    return () => {
      live = false;
    };
  }, [visible, accessToken]);

  const ready = !!questions && answers.length > 0 && answers.every((a) => a !== null);

  const start = async () => {
    if (!questions || !ready) return;
    setBusy(true);
    setError("");
    try {
      await onStart({ questions: questions.map((q) => q.index), answers: answers as number[] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the game.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} title="🧠 About you first" onClose={onClose}>
      <Note>Answer honestly. {partnerName} will try to guess your answers.</Note>
      {!questions && !error && <ActivityIndicator color={palette.navy} />}
      {questions?.map((question, qi) => (
        <View key={question.index} style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>
            {qi + 1}. {question.q}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {question.options.map((option, oi) => (
              <View key={option} style={{ width: "48%" }}>
                <Choice
                  label={option}
                  selected={answers[qi] === oi}
                  onPress={() => setAnswers((current) => current.map((a, i) => (i === qi ? oi : a)))}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
      {!!error && <Text style={{ color: palette.crimson, textAlign: "center" }}>{error}</Text>}
      {!!questions && (
        <PrimaryButton
          label={`Send to ${partnerName}`}
          onPress={() => void start()}
          disabled={!ready}
          busy={busy}
        />
      )}
    </Sheet>
  );
}

/* ---------------- playing a game ---------------- */

function PickGame({
  game,
  partnerName,
  onPlay,
}: {
  game: GameView;
  partnerName: string;
  onPlay: (move: { picks: number[] }) => Promise<void>;
}) {
  const pairs = game.pairs ?? [];
  const [picks, setPicks] = useState<(number | null)[]>(pairs.map(() => null));
  const [busy, setBusy] = useState(false);
  const done = game.status === "done";

  if (!game.myPicks) {
    const ready = picks.every((p) => p !== null);
    return (
      <>
        <Note>Pick one from each. {partnerName} won't see your answers until they answer too.</Note>
        {pairs.map((pair, i) => (
          <View key={pair.join("|")} style={{ flexDirection: "row", gap: 8, alignItems: "stretch" }}>
            <Choice label={pair[0]} selected={picks[i] === 0} onPress={() => setPicks((c) => c.map((p, j) => (j === i ? 0 : p)))} />
            <Text style={{ alignSelf: "center", color: palette.slate, fontFamily: fonts.bodySemi }}>or</Text>
            <Choice label={pair[1]} selected={picks[i] === 1} onPress={() => setPicks((c) => c.map((p, j) => (j === i ? 1 : p)))} />
          </View>
        ))}
        <PrimaryButton
          label="Lock my answers"
          disabled={!ready}
          busy={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await onPlay({ picks: picks as number[] });
            } finally {
              setBusy(false);
            }
          }}
        />
      </>
    );
  }

  if (!done) {
    return (
      <>
        <Note>Your answers are locked in 🔒</Note>
        <Note>Waiting for {partnerName} to answer. Results show up here and in the chat.</Note>
        <ActivityIndicator color={palette.navy} />
      </>
    );
  }

  return (
    <>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, textAlign: "center", color: palette.ink }}>
        {game.matches}/{pairs.length} the same {game.matches === pairs.length ? "🎉" : ""}
      </Text>
      {pairs.map((pair, i) => {
        const same = game.myPicks?.[i] === game.partnerPicks?.[i];
        return (
          <View
            key={pair.join("|")}
            style={{
              borderRadius: radius.md,
              backgroundColor: same ? "#E6F4EE" : palette.paperSand,
              padding: 12,
              gap: 4,
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemi, color: palette.ink }}>
              {same ? "✅ " : ""}
              {pair[0]} or {pair[1]}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>
              You: {pair[game.myPicks?.[i] ?? 0]} · {partnerName}: {pair[game.partnerPicks?.[i] ?? 0]}
            </Text>
          </View>
        );
      })}
    </>
  );
}

function KnowMeGame({
  game,
  partnerName,
  onPlay,
}: {
  game: GameView;
  partnerName: string;
  onPlay: (move: { guesses: number[] }) => Promise<void>;
}) {
  const questions = game.questions ?? [];
  const [guesses, setGuesses] = useState<(number | null)[]>(questions.map(() => null));
  const [busy, setBusy] = useState(false);
  const done = game.status === "done";

  if (game.role === "guesser" && !done) {
    const ready = guesses.every((g) => g !== null);
    return (
      <>
        <Note>How well do you know {partnerName}? Guess their answers.</Note>
        {questions.map((question, qi) => (
          <View key={question.q} style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>
              {qi + 1}. {question.q.replace(/\bMy\b/g, "Their").replace(/\bmy\b/g, "their").replace(/\bAm I\b/g, "Are they").replace(/\bI\b/g, "they")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {question.options.map((option, oi) => (
                <View key={option} style={{ width: "48%" }}>
                  <Choice
                    label={option}
                    selected={guesses[qi] === oi}
                    onPress={() => setGuesses((c) => c.map((g, i) => (i === qi ? oi : g)))}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
        <PrimaryButton
          label="Lock my guesses"
          disabled={!ready}
          busy={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await onPlay({ guesses: guesses as number[] });
            } finally {
              setBusy(false);
            }
          }}
        />
      </>
    );
  }

  if (game.role === "subject" && !done) {
    return (
      <>
        <Note>Your answers are in 🔒 Waiting for {partnerName} to guess.</Note>
        {questions.map((question, qi) => (
          <Text key={question.q} style={{ fontFamily: fonts.body, color: palette.ink }}>
            {question.q} <Text style={{ fontFamily: fonts.bodySemi }}>{question.options[game.truth?.[qi] ?? 0]}</Text>
          </Text>
        ))}
        <ActivityIndicator color={palette.navy} />
      </>
    );
  }

  return (
    <>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, textAlign: "center", color: palette.ink }}>
        {game.role === "guesser" ? "You" : partnerName} got {game.score}/{questions.length} right
      </Text>
      {questions.map((question, qi) => {
        const right = game.guesses?.[qi] === game.truth?.[qi];
        return (
          <View key={question.q} style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.bodySemi, color: palette.ink }}>{question.q}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Choice label={`Answer: ${question.options[game.truth?.[qi] ?? 0]}`} tone="right" />
              <Choice label={`Guess: ${question.options[game.guesses?.[qi] ?? 0]}`} tone={right ? "right" : "wrong"} />
            </View>
          </View>
        );
      })}
    </>
  );
}

function TicTacToe({
  game,
  partnerName,
  onPlay,
}: {
  game: GameView;
  partnerName: string;
  onPlay: (move: { cell: number }) => Promise<void>;
}) {
  const board = game.board ?? Array(9).fill(null);
  const [busy, setBusy] = useState(false);
  const status = game.winner
    ? game.winner === "draw"
      ? "It's a draw 🤝"
      : game.youWon
        ? "You won! 🏆"
        : `${partnerName} won this one 😄`
    : game.yourTurn
      ? `Your turn - you are ${game.mySymbol}`
      : `${partnerName}'s turn...`;
  return (
    <>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, textAlign: "center", color: palette.ink }}>
        {status}
      </Text>
      <View style={{ alignSelf: "center", width: 264, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {board.map((cell, i) => {
          const winning = !!game.line?.includes(i);
          const canTap = !!game.yourTurn && !cell && !busy;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={cell ? `Square ${i + 1}, ${cell}` : `Square ${i + 1}, empty`}
              disabled={!canTap}
              onPress={async () => {
                setBusy(true);
                try {
                  await onPlay({ cell: i });
                } finally {
                  setBusy(false);
                }
              }}
              style={{
                width: 84,
                height: 84,
                borderRadius: radius.md,
                backgroundColor: winning ? "#E6F4EE" : canTap ? palette.paperSand : palette.paperCool,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 40,
                  fontWeight: "700",
                  color: cell === "X" ? palette.navy : palette.crimson,
                }}
              >
                {cell ?? ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!game.winner && !game.yourTurn && <ActivityIndicator color={palette.navy} />}
    </>
  );
}

/**
 * One game, opened from its card. Re-reads every few seconds while it is
 * open and waiting on the other person, so a move or an answer shows up
 * without closing anything.
 */
export function GamePlaySheet({
  gameId,
  accessToken,
  partnerName,
  onClose,
}: {
  gameId: string | null;
  accessToken: string;
  partnerName: string;
  onClose: () => void;
}) {
  const [game, setGame] = useState<GameView | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!gameId) return;
    try {
      setGame(await gamesApi.get(accessToken, gameId));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the game.");
    }
  }, [accessToken, gameId]);

  useEffect(() => {
    setGame(null);
    setError("");
    void refresh();
  }, [refresh]);

  const waiting =
    !!game &&
    game.status === "active" &&
    ((game.kind === "tic_tac_toe" && !game.yourTurn) ||
      ((game.kind === "this_or_that" || game.kind === "would_you_rather") && !!game.myPicks) ||
      (game.kind === "know_me" && game.role === "subject"));

  useEffect(() => {
    if (!gameId || !waiting) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [gameId, waiting, refresh]);

  const play = async (move: { picks?: number[]; guesses?: number[]; cell?: number }) => {
    if (!gameId) return;
    try {
      setGame(await gamesApi.play(accessToken, gameId, move));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That move did not go through.");
      void refresh();
    }
  };

  const title = game ? `${game.emoji} ${game.title}` : "Game";
  return (
    <Sheet visible={!!gameId} title={title} onClose={onClose}>
      {!game && !error && <ActivityIndicator color={palette.navy} />}
      {!!game && (game.kind === "this_or_that" || game.kind === "would_you_rather") && (
        <PickGame key={game.id} game={game} partnerName={partnerName} onPlay={play} />
      )}
      {!!game && game.kind === "know_me" && (
        <KnowMeGame key={game.id} game={game} partnerName={partnerName} onPlay={play} />
      )}
      {!!game && game.kind === "tic_tac_toe" && (
        <TicTacToe game={game} partnerName={partnerName} onPlay={play} />
      )}
      {!!error && <Text style={{ color: palette.crimson, textAlign: "center" }}>{error}</Text>}
    </Sheet>
  );
}
