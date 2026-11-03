import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { SectionTitle, shared } from "../../../components";
import { FormPage } from "../../../components/forms/FormScaffold";
import {
  MiniPremiumIcon,
  PremiumIcon } from "../../../components/premium/PremiumIcon";
import { vibes } from "../../../data";
import {
  alignmentStyles,
  onboardingStyles,
  styles,
  vibeStyles,
} from "../../../theme/appStyles";
import { AppCanvas } from "../../../components/AppCanvas";



/* =========================================================
   GLOW ICON (Dark red background style)
   ========================================================= */
function GlowIcon({
  icon,
  size = 36,
  color = "#FFFFFF",
  glowColor = "#8A1B35",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  glowColor?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(19,15,16,.90)",
        borderWidth: 1.5,
        borderColor: "rgba(218,152,167,.72)",
        shadowColor: glowColor,
        shadowOpacity: 0.72,
        shadowRadius: 13,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
      }}
    >
      <LinearGradient
        colors={[
          "rgba(255,255,255,.22)",
          "rgba(138,27,53,.30)",
          "rgba(23,18,19,.30)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: size / 2,
        }}
      />
      <Ionicons name={icon} size={size * 0.48} color={color} />
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
        <View style={vibeStyles.hero}>
          <Text style={styles.kicker}>{value.length} OF 5 LOCKED IN</Text>
          <Text style={[shared.h1, { textAlign: "center" }]}>
            What’s your real-life vibe?
          </Text>
          <Text
            style={[
              shared.body,
              onboardingStyles.supportingText,
              { textAlign: "center" },
            ]}
          >
            Pick the five that feel most like you. The mix is what makes it
            interesting.
          </Text>
          <View style={vibeStyles.progressDots}>
            {[0, 1, 2, 3, 4].map((index) => (
              <View
                key={index}
                style={[
                  vibeStyles.progressDot,
                  index < value.length && vibeStyles.progressDotOn,
                ]}
              />
            ))}
          </View>
        </View>
        <View style={styles.vibeGrid}>
          {vibes.map((vibe, index) => (
            <Pressable
              onPress={() => toggle(vibe)}
              key={vibe}
              style={[
                styles.vibeCard,
                vibeStyles.card,
                value.includes(vibe) && styles.vibeSelected,
              ]}
            >
              <GlowIcon
                icon={vibeIcons[index] ?? "heart"}
                size={32}
                color="#FFFFFF"
                glowColor="#8A1B35"
              />
              <View style={vibeStyles.copy}>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.vibeText,
                    value.includes(vibe) && styles.vibeTextSelected,
                  ]}
                >
                  {vibe}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    vibeStyles.description,
                    value.includes(vibe) && vibeStyles.descriptionOn,
                  ]}
                >
                  {value.includes(vibe) ? "Locked in" : vibeDescriptions[index]}
                </Text>
              </View>
              {value.includes(vibe) && (
                <View style={vibeStyles.vibeCheck}>
                  <MiniPremiumIcon
                    name="checkmark"
                    tone="gold"
                    size={25}
                    iconSize={12}
                  />
                </View>
              )}
            </Pressable>
          ))}
        </View>
        <View style={vibeStyles.tipCard}>
          <GlowIcon
            icon="sparkles"
            size={30}
            color="#FFFFFF"
            glowColor="#8A1B35"
          />
          <Text
            style={[
              styles.helper,
              onboardingStyles.supportingText,
              { flex: 1 },
            ]}
          >
            Pick your normal-Tuesday self. That’s usually where the best
            chemistry starts.
          </Text>
        </View>

        {/* 🚀 Custom button - dark red gradient */}
        <Pressable
          onPress={onNext}
          disabled={value.length !== 5}
          style={{
            borderRadius: 32,
            overflow: "hidden",
            opacity: value.length !== 5 ? 0.5 : 1,
          }}
        >
          <LinearGradient
            colors={["#151112", "#5C0C1E", "#161113", "#130F10"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 58,
              borderRadius: 32,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 12,
              borderWidth: 1.5,
              borderColor: "rgba(200,103,125,.62)",
              shadowColor: "#8A1B35",
              shadowOpacity: 0.58,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 9 },
            }}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            <Text
              style={{ color: "#191315", fontWeight: "bold", fontSize: 16 }}
            >
              {value.length === 5 ? "Lock in my five" : "Choose 5 to continue"}
            </Text>
          </LinearGradient>
        </Pressable>
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
      description: "I’m ready to meet my life partner.",
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
        <SectionTitle
          emphasis
          eyebrow="NO MIXED SIGNALS"
          title="What are you here for?"
          body="Say it clearly. We’ll show you people looking for the same kind of future."
        />
        <View style={styles.seriousPromise}>
          <GlowIcon
            icon="shield-checkmark"
            size={33}
            color="#FFFFFF"
            glowColor="#8A1B35"
          />
          <Text style={styles.seriousPromiseText}>
            Milaan is for commitment, not casual dating.
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          {options.map((option) => {
            const selected = value === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChange(option.value)}
                style={[styles.intent, selected && styles.intentSelected]}
              >
                <GlowIcon
                  icon={option.icon}
                  size={38}
                  color="#FFFFFF"
                  glowColor="#8A1B35"
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.cardTitle,
                      selected && styles.intentTitleSelected,
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text
                    style={[
                      styles.helper,
                      onboardingStyles.supportingText,
                      selected && styles.intentBodySelected,
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={shared.spacer} />

        {/* 🚀 Custom button - dark red gradient */}
        <Pressable
          onPress={onNext}
          disabled={!value}
          style={{
            borderRadius: 32,
            overflow: "hidden",
            opacity: !value ? 0.5 : 1,
          }}
        >
          <LinearGradient
            colors={["#151112", "#5C0C1E", "#161113", "#130F10"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 58,
              borderRadius: 32,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 12,
              borderWidth: 1.5,
              borderColor: "rgba(200,103,125,.62)",
              shadowColor: "#8A1B35",
              shadowOpacity: 0.58,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 9 },
            }}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            <Text
              style={{ color: "#191315", fontWeight: "bold", fontSize: 16 }}
            >
              Next
            </Text>
          </LinearGradient>
        </Pressable>
      </FormPage>
    </AppCanvas>
  );
}

const alignmentQuestions = [
  {
    key: "timeline",
    eyebrow: "MARRIAGE PACE",
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
    title: "Could love take you to a new city?",
    options: [
      "Yes, I’m open",
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
        <View style={alignmentStyles.hero}>
          <GlowIcon
            icon={
              (question === 0
                ? "diamond"
                : question === 1
                  ? "happy"
                  : question === 2
                    ? "people"
                    : "home") as keyof typeof Ionicons.glyphMap
            }
            size={44}
            color="#FFFFFF"
            glowColor="#8A1B35"
          />
          <Text style={styles.kicker}>{current.eyebrow}</Text>
          <Text style={[shared.h1, { textAlign: "center" }]}>
            {current.title}
          </Text>
          <Text
            style={[
              shared.body,
              onboardingStyles.supportingText,
              { textAlign: "center" },
            ]}
          >
            No perfect answer. Just what feels true for you.
          </Text>
        </View>
        <View style={styles.alignmentProgress}>
          <Text style={[styles.helper, onboardingStyles.supportingText]}>
            {question + 1} of {alignmentQuestions.length}
          </Text>
          <View style={styles.alignmentTrack}>
            <View
              style={[
                styles.alignmentFill,
                {
                  width: `${((question + 1) / alignmentQuestions.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>
        <View style={{ gap: 10 }}>
          {current.options.map((option, index) => {
            const isSelected = selected === option;
            return (
              <Pressable
                key={option}
                onPress={() => onChange({ ...value, [current.key]: option })}
                style={[
                  styles.answer,
                  alignmentStyles.answerCard,
                  isSelected && styles.intentSelected,
                ]}
              >
                <GlowIcon
                  icon={
                    (index === 0
                      ? "heart"
                      : index === 1
                        ? "leaf"
                        : "sparkles") as keyof typeof Ionicons.glyphMap
                  }
                  size={31}
                  color="#FFFFFF"
                  glowColor="#8A1B35"
                />
                <Text
                  style={[
                    styles.answerText,
                    onboardingStyles.answerText,
                    { flex: 1 },
                    isSelected && styles.answerTextSelected,
                  ]}
                >
                  {option}
                </Text>
                <PremiumIcon
                  name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                  tone="ruby"
                  size={28}
                  iconSize={13}
                  referenceGlass
                />
              </Pressable>
            );
          })}
        </View>
        <Text
          style={[
            styles.helper,
            onboardingStyles.supportingText,
            { textAlign: "center" },
          ]}
        >
          Private by default. Change anytime.
        </Text>
        <View style={shared.spacer} />

        {/* 🚀 Custom button - dark red gradient */}
        <Pressable
          onPress={advance}
          disabled={!selected}
          style={{
            borderRadius: 32,
            overflow: "hidden",
            opacity: !selected ? 0.5 : 1,
          }}
        >
          <LinearGradient
            colors={["#151112", "#5C0C1E", "#161113", "#130F10"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 58,
              borderRadius: 32,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 12,
              borderWidth: 1.5,
              borderColor: "rgba(200,103,125,.62)",
              shadowColor: "#8A1B35",
              shadowOpacity: 0.58,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 9 },
            }}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            <Text
              style={{ color: "#191315", fontWeight: "bold", fontSize: 16 }}
            >
              {question === alignmentQuestions.length - 1
                ? "See my introductions"
                : "Next"}
            </Text>
          </LinearGradient>
        </Pressable>
      </FormPage>
    </AppCanvas>
  );
}
