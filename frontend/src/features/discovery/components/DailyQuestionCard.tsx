import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { brand, cardShadow, whiteCard } from "../../../components/brand";
import { PressScale } from "../../../components/motion";
import {
  dailyQuestionApi,
  type DailyQuestionToday,
} from "../../../api/dailyQuestionApi";
import { fonts, palette, radius, typeScale } from "../../../theme";

/**
 * Today's question on Home.
 *
 * Same question for everyone, new one at midnight India time. Answering
 * gives one Spark - the server pays it, the card only shows it. It is the
 * navy "hero" card of Home (components/brand.ts), with a real count of how
 * many people answered today. Once
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

  const countLine =
    today.answeredToday && today.answeredToday > 0
      ? `${today.answeredToday} answered today`
      : "Be the first today";

  if (today.answered) {
    return (
      <View
        accessibilityLabel="Today's question answered"
        style={{
          ...whiteCard,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 12,
          paddingHorizontal: 14,
          marginBottom: 16,
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
        {!!today.answeredToday && (
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.slate }}>
            {today.answeredToday} today
          </Text>
        )}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={brand.heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        gap: 12,
        ...cardShadow,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <View style={{ backgroundColor: palette.crimson, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: brand.onHero, letterSpacing: 0.6 }}>
            DAILY QUESTION
          </Text>
        </View>
        <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 12, color: brand.onHeroSoft }}>{countLine}</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: "rgba(255,255,255,0.14)",
            borderRadius: radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 12 }}>✨</Text>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: brand.onHero }}>
            +{today.reward} Spark
          </Text>
        </View>
      </View>
      <Text
        style={{
          fontFamily: fonts.bodySemi,
          fontSize: 18,
          lineHeight: 24,
          color: brand.onHero,
        }}
      >
        {question.text}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {question.options.map((option) => (
          <PressScale
            key={option}
            accessibilityRole="button"
            accessibilityLabel={`Answer: ${option}`}
            disabled={!!sending}
            onPress={() => void choose(option)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 38,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: sending === option ? brand.onHero : "rgba(255,255,255,0.4)",
              backgroundColor: sending === option ? brand.onHero : "rgba(255,255,255,0.12)",
              paddingHorizontal: 14,
              opacity: sending && sending !== option ? 0.5 : 1,
            }}
          >
            {sending === option && <ActivityIndicator size="small" color={palette.navy} />}
            <Text
              style={{
                fontFamily: fonts.bodySemi,
                fontSize: 14,
                color: sending === option ? palette.navy : brand.onHero,
              }}
            >
              {option}
            </Text>
          </PressScale>
        ))}
      </View>
      {!!error && (
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: "#FFD6DC" }}>
          {error}
        </Text>
      )}
    </LinearGradient>
  );
}
