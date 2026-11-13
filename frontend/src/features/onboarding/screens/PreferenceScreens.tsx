import { useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { FormPage } from "../../../components/forms/FormScaffold";
import { vibes } from "../../../data";
import { fonts, palette, radius } from "../../../theme";
import { AppCanvas } from "../../../components/AppCanvas";
import { whiteCard } from "../../../components/brand";
import { GlowPulse, PressScale, Reveal } from "../../../components/motion";

const MAX_WIDTH = 720;
const SIDE_PADDING = 16;

function IconBadge({
  icon,
  size = 40,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  active?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? palette.crimson : palette.crimsonTint,
      }}
    >
      <Ionicons
        name={icon}
        size={size * 0.45}
        color={active ? "#FFFFFF" : palette.crimson}
      />
    </View>
  );
}

const vibeIcons: Array<keyof typeof Ionicons.glyphMap> = [
  "people",
  "rocket",
  "airplane",
  "barbell",
  "sparkles",
  "restaurant",
  "briefcase",
  "leaf",
  "heart-circle",
  "color-palette",
  "home",
  "flower",
  "paw",
  "book",
  "musical-notes",
  "globe",
];

const vibeDescriptions = [
  "Roots matter",
  "Big goals",
  "Always exploring",
  "Move & grow",
  "Inner calm",
  "New table? Yes.",
  "Build mode",
  "Low-key joy",
  "Talk it through",
  "Make something",
  "Cozy future",
  "Tradition + now",
  "Animal person",
  "One more chapter",
  "Live & loud",
  "Show up for people",
];

function WarmCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        width: "100%",
        maxWidth: MAX_WIDTH,
        alignSelf: "center",
        paddingHorizontal: SIDE_PADDING,
        paddingVertical: 20,
      }}
    >
      {children}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  icon = "arrow-forward",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: palette.crimson,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: radius.pill,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 52,
        marginTop: 24,
        opacity: disabled ? 0.4 : 1,
        overflow: "hidden",
      }}
    >
      {!disabled && (
        <GlowPulse color={palette.crimson} radius={radius.pill} spread={1.12} />
      )}
      <Ionicons name={icon} size={18} color="#FFFFFF" />
      <Text
        style={{
          color: "#FFFFFF",
          fontFamily: fonts.bodySemi,
          fontSize: 15,
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}

export function VibesScreen({
  value,
  onChange,
  onNext,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  onNext: () => void;
}) {
  const toggle = (vibe: string) =>
    onChange(
      value.includes(vibe)
        ? value.filter((item) => item !== vibe)
        : value.length < 5
          ? [...value, vibe]
          : value,
    );

  return (
    <AppCanvas>
      <FormPage step={4} scroll>
        <WarmCard>
          <Text
            style={{
              fontFamily: fonts.bodySemi,
              fontSize: 11,
              color: palette.crimson,
              letterSpacing: 1,
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {value.length} of 5 locked in
          </Text>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 26,
              lineHeight: 32,
              color: palette.ink,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            What's your real-life vibe?
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: palette.slate,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            Pick the five that feel most like you. The mix is what makes it
            interesting.
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            {[0, 1, 2, 3, 4].map((index) => (
              <View
                key={index}
                style={{
                  width: 28,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor:
                    index < value.length ? palette.crimson : palette.rule,
                }}
              />
            ))}
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            {vibes.map((vibe, index) => {
              const selected = value.includes(vibe);
              return (
                <Reveal
                  key={vibe}
                  delay={Math.min(index, 8) * 40}
                  style={{ width: "48%", marginBottom: 8 }}
                >
                  <PressScale
                    accessibilityRole="button"
                    accessibilityLabel={vibe}
                    accessibilityState={{ selected }}
                    onPress={() => toggle(vibe)}
                    style={{
                      width: "100%",
                      backgroundColor: selected
                        ? palette.crimson
                        : palette.paper,
                      borderRadius: radius.lg,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      borderWidth: selected ? 0 : 1,
                      borderColor: palette.rule,
                      minHeight: 56,
                      ...(selected ? {} : whiteCard),
                    }}
                  >
                    <IconBadge
                      icon={vibeIcons[index] ?? "heart"}
                      size={32}
                      active={selected}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={2}
                        style={{
                          fontFamily: fonts.bodySemi,
                          fontSize: 13,
                          color: selected ? "#FFFFFF" : palette.ink,
                        }}
                      >
                        {vibe}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontFamily: fonts.body,
                          fontSize: 11,
                          color: selected ? "#F7E3E7" : palette.slate,
                          marginTop: 1,
                        }}
                      >
                        {selected ? "Locked in" : vibeDescriptions[index]}
                      </Text>
                    </View>
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#FFFFFF"
                      />
                    )}
                  </PressScale>
                </Reveal>
              );
            })}
          </View>

          <View
            style={{
              backgroundColor: palette.crimsonTint,
              borderRadius: radius.lg,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 16,
            }}
          >
            <IconBadge icon="sparkles" size={30} />
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.body,
                fontSize: 13,
                color: palette.inkSoft,
                lineHeight: 19,
              }}
            >
              Pick your normal-Tuesday self. That's usually where the best
              chemistry starts.
            </Text>
          </View>

          <PrimaryButton
            label={
              value.length === 5 ? "Lock in my five" : "Choose 5 to continue"
            }
            onPress={onNext}
            disabled={value.length !== 5}
          />
        </WarmCard>
      </FormPage>
    </AppCanvas>
  );
}

export function IntentScreen({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  const options = [
    {
      value: "Long-term Relationship",
      title: "Long-term relationship",
      description: "Something steady, exclusive and built to last.",
      icon: "heart-outline" as const,
    },
    {
      value: "Marriage",
      title: "Marriage",
      description: "I'm ready to meet my life partner.",
      icon: "diamond-outline" as const,
    },
    {
      value: "Long-term, leading to Marriage",
      title: "Long-term, leading to marriage",
      description: "Let it grow naturally, with marriage in view.",
      icon: "infinite-outline" as const,
    },
  ];

  return (
    <AppCanvas>
      <FormPage step={5}>
        <WarmCard>
          <Text
            style={{
              fontFamily: fonts.bodySemi,
              fontSize: 11,
              color: palette.crimson,
              letterSpacing: 1,
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            No mixed signals
          </Text>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 26,
              lineHeight: 32,
              color: palette.ink,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            What are you here for?
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: palette.slate,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 20,
            }}
          >
            Say it clearly. We'll show you people looking for the same kind of
            future.
          </Text>

          <View
            style={{
              backgroundColor: palette.crimsonTint,
              borderRadius: radius.lg,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <IconBadge icon="shield-checkmark" size={32} />
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.body,
                fontSize: 13,
                color: palette.ink,
                lineHeight: 19,
              }}
            >
              Apnajoda is for commitment, not casual dating.
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            {options.map((option, idx) => {
              const selected = value === option.value;
              return (
                <Reveal key={option.value} delay={idx * 60}>
                  <PressScale
                    accessibilityRole="button"
                    accessibilityLabel={option.title}
                    accessibilityState={{ selected }}
                    onPress={() => onChange(option.value)}
                    style={{
                      backgroundColor: selected
                        ? palette.crimson
                        : palette.paper,
                      borderRadius: radius.lg,
                      padding: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      borderWidth: selected ? 0 : 1,
                      borderColor: palette.rule,
                      minHeight: 64,
                      ...(selected ? {} : whiteCard),
                    }}
                  >
                    <IconBadge icon={option.icon} size={36} active={selected} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: fonts.bodySemi,
                          fontSize: 15,
                          color: selected ? "#FFFFFF" : palette.ink,
                        }}
                      >
                        {option.title}
                      </Text>
                      <Text
                        style={{
                          fontFamily: fonts.body,
                          fontSize: 12,
                          color: selected ? "#F7E3E7" : palette.slate,
                          marginTop: 2,
                          lineHeight: 17,
                        }}
                      >
                        {option.description}
                      </Text>
                    </View>
                    <Ionicons
                      name={selected ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={selected ? "#FFFFFF" : palette.slate}
                    />
                  </PressScale>
                </Reveal>
              );
            })}
          </View>

          <PrimaryButton label="Next" onPress={onNext} disabled={!value} />
        </WarmCard>
      </FormPage>
    </AppCanvas>
  );
}

const alignmentQuestions = [
  {
    key: "timeline",
    eyebrow: "MARRIAGE PACE",
    icon: "diamond" as const,
    title: "What pace feels right for marriage?",
    options: [
      "Within 1–2 years",
      "Within 2–3 years",
      "When the relationship feels ready",
    ],
  },
  {
    key: "children",
    eyebrow: "FAMILY PLANS",
    icon: "happy" as const,
    title: "Do you see children in your future?",
    options: [
      "Definitely want children",
      "Open to children",
      "Do not want children",
    ],
  },
  {
    key: "family",
    eyebrow: "FAMILY & US",
    icon: "people" as const,
    title: "How close should family be to your relationship?",
    options: [
      "Family is deeply involved",
      "Close, with healthy boundaries",
      "Mostly independent as a couple",
    ],
  },
  {
    key: "relocation",
    eyebrow: "WHERE LIFE GOES",
    icon: "home" as const,
    title: "Could love take you to a new city?",
    options: [
      "Yes, I'm open",
      "Depends on career and family",
      "I prefer to stay in my city",
    ],
  },
];

export function AlignmentScreen({
  value,
  onChange,
  onNext,
}: {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  onNext: () => void;
}) {
  const [question, setQuestion] = useState(0);
  const current = alignmentQuestions[question]!;
  const selected = value[current.key];
  const advance = () =>
    question < alignmentQuestions.length - 1
      ? setQuestion(question + 1)
      : onNext();

  return (
    <AppCanvas>
      <FormPage step={6}>
        <WarmCard>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <IconBadge icon={current.icon} size={52} active />
          </View>
          <Text
            style={{
              fontFamily: fonts.bodySemi,
              fontSize: 11,
              color: palette.crimson,
              letterSpacing: 1,
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {current.eyebrow}
          </Text>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 24,
              lineHeight: 30,
              color: palette.ink,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {current.title}
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: palette.slate,
              textAlign: "center",
              lineHeight: 19,
              marginBottom: 20,
            }}
          >
            No perfect answer. Just what feels true for you.
          </Text>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                color: palette.slate,
                marginBottom: 6,
              }}
            >
              {question + 1} of {alignmentQuestions.length}
            </Text>
            <View
              style={{
                height: 5,
                backgroundColor: palette.rule,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${((question + 1) / alignmentQuestions.length) * 100}%`,
                  backgroundColor: palette.crimson,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {current.options.map((option, index) => {
              const isSelected = selected === option;
              return (
                <Reveal key={option} delay={index * 60}>
                  <PressScale
                    accessibilityRole="button"
                    accessibilityLabel={option}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() =>
                      onChange({ ...value, [current.key]: option })
                    }
                    style={{
                      backgroundColor: isSelected
                        ? palette.crimson
                        : palette.paper,
                      borderRadius: radius.lg,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: palette.rule,
                      minHeight: 60,
                      ...(isSelected ? {} : whiteCard),
                    }}
                  >
                    <IconBadge
                      icon={
                        index === 0
                          ? "heart"
                          : index === 1
                            ? "leaf"
                            : "sparkles"
                      }
                      size={32}
                      active={isSelected}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: fonts.bodySemi,
                        fontSize: 14,
                        color: isSelected ? "#FFFFFF" : palette.ink,
                      }}
                    >
                      {option}
                    </Text>
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={isSelected ? "#FFFFFF" : palette.slate}
                    />
                  </PressScale>
                </Reveal>
              );
            })}
          </View>

          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              color: palette.slate,
              textAlign: "center",
              marginTop: 16,
            }}
          >
            Private by default. Change anytime.
          </Text>

          <PrimaryButton
            label={
              question === alignmentQuestions.length - 1
                ? "See my introductions"
                : "Next"
            }
            onPress={advance}
            disabled={!selected}
          />
        </WarmCard>
      </FormPage>
    </AppCanvas>
  );
}
