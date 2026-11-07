import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, typeScale } from "./theme";

const brandLogo = require("../assets/apnajoda-logo.png");

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <View style={styles.brand}>
      {/* The lockup already contains the wordmark, so the name is not set
          again in the UI font beside it: that put the brand on screen twice,
          in two typefaces, one of them not the brand's. The box keeps the
          asset's own 1600x460 ratio and uses `contain`, so it is never
          cropped. */}
      <Image
        source={brandLogo}
        resizeMode="contain"
        accessibilityLabel="Apnajoda"
        style={small ? styles.logoLockupSmall : styles.logoLockup}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "gold";
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  const content = (
    <>
      {icon && (
        <LinearGradient
          colors={
            variant === "gold"
              ? ["#DAB3BB", colors.gold, "#651827"]
              : ["#6693C1", colors.pink, "#133456"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonIconBadge}
        >
          <Ionicons name={icon} size={14} color="#FDFDFD" />
        </LinearGradient>
      )}
      <Text
        maxFontSizeMultiplier={1.3}
        style={[
          styles.buttonText,
          variant === "primary" && { color: "#FFFFFF" },
          variant === "gold" && { color: "#111315" },
          variant === "ghost" && { color: colors.muted },
        ]}
      >
        {label}
      </Text>
    </>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
        disabled && { opacity: 0.45 },
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={["#20558B", colors.pink, "#133557"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, styles.primary]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.button, styles[variant]]}>{content}</View>
      )}
    </Pressable>
  );
}

export function Field({ label, error, emphasis = false, ...inputProps }: any) {
  return (
    <View style={styles.field}>
      <Text maxFontSizeMultiplier={1.3} style={styles.label}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error || undefined}
        placeholderTextColor="#484C51"
        selectionColor={colors.wine}
        style={[
          styles.input,
          emphasis && styles.inputEmphasis,
          error && styles.inputError,
        ]}
        {...inputProps}
      />
      {error && (
        <Text
          accessibilityRole="alert"
          style={[styles.error, emphasis && styles.errorEmphasis]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  gold,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  gold?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={label}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      hitSlop={4}
      onPress={onPress}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        gold && styles.chipGold,
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.3}
        style={[styles.chipText, gold && { color: "#111315" }]}
      >
        {label}
      </Text>
      {selected && (
        <LinearGradient
          colors={["#D6A1AC", colors.gold, "#531320"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chipCheck}
        >
          <Ionicons name="checkmark" size={10} color="#0F1113" />
        </LinearGradient>
      )}
    </Pressable>
  );
}

export function StepBar({ step, total = 5 }: { step: number; total?: number }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: Math.min(step, total) }}
      style={styles.steps}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.step, i < step && styles.stepActive]} />
      ))}
    </View>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  body,
  emphasis = false,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  emphasis?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      {eyebrow && (
        <Text maxFontSizeMultiplier={1.25} style={styles.eyebrow}>
          {eyebrow}
        </Text>
      )}
      <Text
        accessibilityRole="header"
        maxFontSizeMultiplier={1.25}
        style={styles.h1}
      >
        {title}
      </Text>
      {body && (
        <Text
          maxFontSizeMultiplier={1.35}
          style={[styles.body, emphasis && styles.bodyEmphasis]}
        >
          {body}
        </Text>
      )}
    </View>
  );
}

export const shared = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  safe: {
    flex: 1,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
    paddingHorizontal: 18,
  },
  content: { flex: 1, gap: 20 },
  h1: {
    fontFamily: "Mukta_700Bold",
    fontSize: typeScale.display,
    lineHeight: 36,
    letterSpacing: 0,
    color: colors.text,
  },
  h2: {
    fontFamily: "Mukta_700Bold",
    fontSize: typeScale.title,
    lineHeight: 28,
    letterSpacing: 0,
    color: colors.text,
  },
  body: {
    fontFamily: "Mukta_400Regular",
    fontSize: typeScale.body,
    lineHeight: 21,
    letterSpacing: 0,
    color: colors.muted,
  },
  label: {
    fontFamily: "Mukta_600SemiBold",
    fontSize: typeScale.label,
    lineHeight: 17,
    letterSpacing: 0,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 16,
  },
  row: { flexDirection: "row", alignItems: "center" },
  spacer: { flex: 1 },
});

export const fieldStyles = {
  get input() { return styles.input; },
  get inputEmphasis() { return styles.inputEmphasis; },
  get inputError() { return styles.inputError; },
  get label() { return styles.label; },
};

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  // 1600x460 is the lockup's own ratio. Keep the two in step if it changes.
  logoLockup: { width: 164, height: 47 },
  logoLockupSmall: { width: 125, height: 36 },
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
  },
  primary: {
    shadowColor: colors.pink,
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ghost: { backgroundColor: "transparent" },
  gold: {
    backgroundColor: "#E1C8CD",
    borderWidth: 1,
    borderColor: colors.gold,
  },
  buttonIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D3D6DA",
    shadowColor: colors.pink,
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  buttonText: {
    fontFamily: "Mukta_700Bold",
    fontSize: typeScale.body,
    letterSpacing: 0,
    color: colors.text,
  },
  field: { gap: 7, minWidth: 0, width: "100%" },
  label: {
    fontFamily: "Mukta_600SemiBold",
    fontSize: typeScale.label,
    lineHeight: 17,
    letterSpacing: 0,
    color: colors.text,
  },
  input: {
    width: "100%",
    minWidth: 0,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 15,
    fontFamily: "Mukta_400Regular",
    fontSize: typeScale.body,
    letterSpacing: 0,
  },
  inputEmphasis: { fontFamily: "Mukta_600SemiBold" },
  inputError: { borderColor: colors.danger },
  error: {
    fontFamily: "Mukta_400Regular",
    fontSize: 12,
    lineHeight: 17,
    color: colors.danger,
  },
  errorEmphasis: { fontFamily: "Mukta_600SemiBold" },
  chip: {
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#FDFDFD",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chipSelected: {
    backgroundColor: colors.selectedSurface,
    borderColor: colors.selectedBorder,
  },
  chipGold: { backgroundColor: "#E1C8CD", borderColor: colors.gold },
  chipText: {
    color: colors.text,
    fontFamily: "Mukta_600SemiBold",
    fontSize: 12,
  },
  chipCheck: {
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D3D6DA",
    shadowColor: colors.gold,
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  steps: { height: 4, flexDirection: "row", gap: 5 },
  step: { flex: 1, backgroundColor: colors.line, borderRadius: 5 },
  stepActive: {
    backgroundColor: colors.pink,
    shadowColor: colors.pink,
    shadowOpacity: 0.55,
    shadowRadius: 8,
  },
  eyebrow: {
    fontFamily: "Mukta_700Bold",
    fontSize: typeScale.caption,
    letterSpacing: 0,
    textTransform: "uppercase",
    color: colors.accent,
  },
  h1: {
    fontFamily: "Mukta_700Bold",
    fontSize: 27,
    lineHeight: 34,
    letterSpacing: 0,
    color: colors.text,
  },
  body: {
    fontFamily: "Mukta_400Regular",
    fontSize: typeScale.body,
    lineHeight: 21,
    letterSpacing: 0,
    color: colors.muted,
  },
  bodyEmphasis: { fontFamily: "Mukta_600SemiBold" },
});
