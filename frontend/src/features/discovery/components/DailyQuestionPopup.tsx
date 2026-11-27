import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  dailyQuestionApi,
  type DailyQuestionToday,
} from "../../../api/dailyQuestionApi";
import { Modal } from "../../../components/BackModal";
import { fonts, palette } from "../../../theme";

/**
 * Question ids the popup has already opened for in this app run. Home is
 * mounted again on every visit, so without this it would pop up each time.
 */
let openedFor: string | null = null;

/**
 * Today's question, as a glass popup over Home.
 *
 * It opens by itself when the member has not answered yet. The glass is a
 * real blur, with a light sheen that slides across it (liquid glass). Answering
 * gives one Spark (the server pays it); the popup then says so and closes.
 */
export function DailyQuestionPopup({
  accessToken,
  onRewarded,
}: {
  accessToken?: string;
  /** Called after a Spark is paid, so the Spark count can refresh. */
  onRewarded?: () => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 48, 340);
  const [today, setToday] = useState<DailyQuestionToday | null>(null);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [justRewarded, setJustRewarded] = useState(false);

  // Load today's question once. Home must never break if it cannot load.
  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    dailyQuestionApi
      .today(accessToken)
      .then((loaded) => {
        if (!live) return;
        setToday(loaded);
        // Opens only while today's question is unanswered, and only once per app run.
        // Once answered, it never opens on Home again today.
        if (loaded?.question && !loaded.answered && openedFor !== String(loaded.question.id)) {
          openedFor = String(loaded.question.id);
          setOpen(true);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [accessToken]);

  // After a Spark is paid, the popup thanks you and closes by itself.
  useEffect(() => {
    if (!justRewarded) return;
    const timer = setTimeout(() => setOpen(false), 2200);
    return () => clearTimeout(timer);
  }, [justRewarded]);

  if (!accessToken || !today?.question) return null;
  const question = today.question;

  const choose = async (option: string) => {
    if (sending) return;
    setSending(option);
    setError("");
    try {
      await dailyQuestionApi.answer(accessToken, question.id, option);
      setToday({ ...today, answered: true, answer: option });
      setJustRewarded(true);
      onRewarded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your answer.");
    } finally {
      setSending(null);
    }
  };

  const countLine =
    today.answeredToday && today.answeredToday > 0
      ? `${today.answeredToday} answered today`
      : "Be the first today";

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.backdrop}>
        {/* Tapping outside the glass closes the popup. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close daily question"
          onPress={() => setOpen(false)}
          style={StyleSheet.absoluteFill}
        />
        <GlassCard width={cardWidth}>
          {justRewarded || today.answered ? (
            <View style={{ alignItems: "center", gap: 10, paddingVertical: 6 }}>
              <Ionicons name="checkmark-circle" size={40} color={palette.emerald} />
              <Text style={styles.doneTitle}>
                {justRewarded ? `+${today.reward} Spark added` : "Today's question is done"}
              </Text>
              <Text style={styles.doneBody}>
                {today.answer ? `You answered "${today.answer}". ` : ""}New question tomorrow.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close daily question"
                onPress={() => setOpen(false)}
                style={styles.closePill}
              >
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>DAILY QUESTION</Text>
                </View>
                <Text style={styles.count}>{countLine}</Text>
                <View style={styles.sparkChip}>
                  <Text style={{ fontSize: 12 }}>✨</Text>
                  <Text style={styles.sparkText}>+{today.reward} Spark</Text>
                </View>
              </View>
              <Text style={styles.question}>{question.text}</Text>
              <View style={styles.options}>
                {question.options.map((option) => (
                  <LiquidOption
                    key={option}
                    label={option}
                    picked={sending === option}
                    dim={!!sending && sending !== option}
                    disabled={!!sending}
                    onPress={() => void choose(option)}
                  />
                ))}
              </View>
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Maybe later"
                onPress={() => setOpen(false)}
                style={{ alignSelf: "center", paddingVertical: 6 }}
              >
                <Text style={styles.later}>Maybe later</Text>
              </Pressable>
            </>
          )}
        </GlassCard>
      </View>
    </Modal>
  );
}

/**
 * An answer as a water drop, like the bottom bar's lens: it bulges under your
 * finger, a ring ripples out, and it has the same gloss. Picked = navy.
 */
function LiquidOption({
  label,
  picked,
  dim,
  disabled,
  onPress,
}: {
  label: string;
  picked: boolean;
  dim: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const bulge = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(1)).current;
  const native = Platform.OS !== "web";

  const pressIn = () => {
    Animated.spring(bulge, { toValue: 1.1, friction: 5, tension: 140, useNativeDriver: native }).start();
    ring.setValue(0);
    Animated.timing(ring, { toValue: 1, duration: 520, useNativeDriver: native }).start();
  };
  const pressOut = () => {
    Animated.spring(bulge, { toValue: 1, friction: 6, tension: 110, useNativeDriver: native }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Answer: ${label}`}
      accessibilityState={{ selected: picked, disabled }}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress}
      style={{ opacity: dim ? 0.5 : 1 }}
    >
      <Animated.View style={[styles.option, picked && styles.optionPicked, { transform: [{ scale: bulge }] }]}>
        <LinearGradient
          colors={picked ? ["rgba(255,255,255,0.3)", "rgba(255,255,255,0)"] : ["rgba(255,255,255,0.95)", "rgba(255,255,255,0.1)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringMark,
            {
              opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }],
            },
          ]}
        />
        <Text style={[styles.optionText, picked && styles.optionTextPicked]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Frosted glass with a moving sheen: a real blur, a light gradient on top,
 * a thin white rim, and a highlight band that slides across (liquid glass).
 */
function GlassCard({ width, children }: { width: number; children: ReactNode }) {
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shine, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shine]);

  const sheenX = shine.interpolate({ inputRange: [0, 1], outputRange: [-width, width * 1.6] });

  return (
    <View style={[styles.glass, { width }]}>
      <BlurView intensity={75} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(255,255,255,0.92)", "rgba(255,255,255,0.8)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX: sheenX }, { rotate: "18deg" }] }]}>
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.42)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: width * 0.45, height: "100%", alignSelf: "center" }}
        />
      </Animated.View>
      <View pointerEvents="none" style={styles.rim} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: "rgba(20,16,46,0.4)",
  },
  glass: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#2A0A1E",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    margin: 1,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  content: {
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  pill: {
    backgroundColor: palette.crimson,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "#FFFFFF",
    letterSpacing: 0.6,
  },
  count: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.slate,
  },
  sparkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sparkText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: palette.navyDeep,
  },
  question: {
    fontFamily: fonts.bodySemi,
    fontSize: 18,
    lineHeight: 24,
    color: palette.ink,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    backgroundColor: "rgba(255,255,255,0.6)",
    paddingHorizontal: 14,
    shadowColor: palette.navy,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  optionPicked: {
    backgroundColor: palette.navy,
    borderColor: palette.navy,
  },
  optionText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: palette.navy,
  },
  optionTextPicked: {
    color: "#FFFFFF",
  },
  ringMark: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.crimson,
  },
  later: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: palette.slate,
  },
  doneTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: palette.ink,
  },
  doneBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.slate,
    textAlign: "center",
  },
  closePill: {
    marginTop: 4,
    backgroundColor: palette.navy,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  closeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
