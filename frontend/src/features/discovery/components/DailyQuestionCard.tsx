import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import {
  dailyQuestionApi,
  type DailyQuestionToday,
} from "../../../api/dailyQuestionApi";
import { fonts, palette, radius, typeScale } from "../../../theme";

/**
 * Today's question on Home.
 *
 * Same question for everyone, new one at midnight India time. Answering
 * gives one Spark - the server pays it, the card only shows it. Once
 * answered the card shrinks to one line so it does not keep taking up the
 * top of Home for the rest of the day.
 */
export function DailyQuestionCard({
  accessToken,
  onRewarded,
}: {
  accessToken?: string;
  /** Called after a Spark is paid, so the Spark count can refresh. */
  onRewarded?: () => void;
}) {
  const [today, setToday] = useState<DailyQuestionToday | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [justRewarded, setJustRewarded] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setToday(await dailyQuestionApi.today(accessToken));
    } catch {
      // Home must never break because the question did not load.
      setToday(null);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

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
      // The question may have rolled over, or they answered elsewhere.
      void load();
    } finally {
      setSending(null);
    }
  };

  if (today.answered) {
    return (
      <View
        accessibilityLabel="Today's question answered"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: palette.paperSand,
          borderRadius: radius.md,
          paddingVertical: 12,
          paddingHorizontal: 14,
          marginBottom: 20,
        }}
      >
        <Ionicons name="checkmark-circle" size={20} color={palette.emerald} />
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.body,
            fontSize: typeScale.label,
            color: palette.ink,
          }}
        >
          {justRewarded
            ? `✨ +${today.reward} Spark added. New question tomorrow.`
            : today.answer
              ? `You answered "${today.answer}". New question tomorrow.`
              : "Today's question is done. New one tomorrow."}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: palette.paper,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.crimsonSoft,
        padding: 16,
        marginBottom: 20,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 18 }}>💭</Text>
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.bodySemi,
            fontSize: 12,
            color: palette.crimson,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          Today's question
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: palette.marigoldTint,
            borderRadius: radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 12 }}>✨</Text>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.ink }}>
            +{today.reward} Spark
          </Text>
        </View>
      </View>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 20,
          lineHeight: 26,
          color: palette.ink,
        }}
      >
        {question.text}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {question.options.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityLabel={`Answer: ${option}`}
            disabled={!!sending}
            onPress={() => void choose(option)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: palette.navy,
              backgroundColor: pressed ? palette.paperCool : palette.paper,
              paddingHorizontal: 14,
              paddingVertical: 9,
              opacity: sending && sending !== option ? 0.5 : 1,
            })}
          >
            {sending === option && <ActivityIndicator size="small" color={palette.navy} />}
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.navy }}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
      {!!error && (
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.crimson }}>
          {error}
        </Text>
      )}
    </View>
  );
}
