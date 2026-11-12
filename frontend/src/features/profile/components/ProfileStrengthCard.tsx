import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, palette, radius } from "../../../theme";
import type { StrengthScreen, StrengthStep } from "../../../domain/profileStrength";

/**
 * "Profile strength 65%" on your own profile: one bar, the single most
 * useful next step with a button that goes straight there, and the rest of
 * the open steps behind "Show all". Until the one-time reward is paid it
 * says 100% earns a free Super Like. At 100% it shrinks to one line.
 */
export function ProfileStrengthCard({
  score,
  steps,
  next,
  onGo,
  rewardClaimed = false,
}: {
  score: number;
  steps: StrengthStep[];
  next: StrengthStep | null;
  onGo: (screen: StrengthScreen) => void;
  rewardClaimed?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  if (score >= 100) {
    return (
      <View
        accessibilityLabel="Profile strength 100 percent, complete"
        style={{
          marginTop: 18,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: radius.md,
          backgroundColor: palette.paperSand,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Ionicons name="checkmark-circle" size={18} color={palette.emerald} />
        <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink }}>
          Profile strength 100%
        </Text>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.emerald }}>Complete</Text>
      </View>
    );
  }

  const waiting = steps.find((step) => step.waiting);
  const others = steps.filter((step) => !step.done && !step.waiting && step.key !== next?.key);

  return (
    <View
      accessibilityLabel={`Profile strength ${score} percent`}
      style={{
        marginTop: 18,
        padding: 16,
        borderRadius: radius.md,
        backgroundColor: palette.paperSand,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>Profile strength</Text>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 18, color: palette.navy }}>{score}%</Text>
      </View>
      {!rewardClaimed && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4 }}>
          <Ionicons name="star" size={13} color={palette.marigold} />
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
            Reach 100% and get a free Super Like.
          </Text>
        </View>
      )}
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: score }}
        style={{ height: 8, borderRadius: 4, backgroundColor: palette.paper, overflow: "hidden" }}
      >
        <View style={{ width: `${score}%`, height: "100%", borderRadius: 4, backgroundColor: palette.navy }} />
      </View>

      {next && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>
              {next.label} <Text style={{ color: palette.navy }}>+{next.points}%</Text>
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate, lineHeight: 17 }}>
              {next.why}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={next.label}
            onPress={() => onGo(next.screen)}
            style={{
              backgroundColor: palette.navy,
              borderRadius: radius.pill,
              paddingHorizontal: 16,
              minHeight: 40,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#FFFFFF" }}>Do it</Text>
          </Pressable>
        </View>
      )}

      {waiting && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="time-outline" size={14} color={palette.slate} />
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
            Selfie under review - +{waiting.points}% when it is approved.
          </Text>
        </View>
      )}

      {others.length > 0 && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showAll }}
            onPress={() => setShowAll((open) => !open)}
            hitSlop={8}
          >
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.navy }}>
              {showAll ? "Hide other steps" : `Show ${others.length} more ${others.length === 1 ? "step" : "steps"}`}
            </Text>
          </Pressable>
          {showAll &&
            others.map((step) => (
              <Pressable
                key={step.key}
                accessibilityRole="button"
                accessibilityLabel={`${step.label}, plus ${step.points} percent`}
                onPress={() => onGo(step.screen)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 8,
                  borderTopWidth: 1,
                  borderTopColor: palette.rule,
                }}
              >
                <Ionicons name="ellipse-outline" size={16} color={palette.navySoft} />
                <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 13, color: palette.ink }}>{step.label}</Text>
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.navy }}>+{step.points}%</Text>
                <Ionicons name="chevron-forward" size={14} color={palette.slate} />
              </Pressable>
            ))}
        </>
      )}
    </View>
  );
}
