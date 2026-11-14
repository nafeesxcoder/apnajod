/**
 * The festival on Home: a warm banner under the greeting while the admin
 * has a theme on - "Happy Diwali, Aarav!" with a row of diyas - and a
 * button to post a festive story.
 */
import { Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { fonts, radius } from "../../theme";
import { PressScale } from "../../components/motion";
import type { FestivalTheme } from "./themes";
import { greetingLine } from "./themes";

export function FestivalBanner({
  theme,
  name,
  onStory,
}: {
  theme: FestivalTheme;
  name: string;
  onStory?: () => void;
}) {
  return (
    <LinearGradient
      accessibilityLabel={`${theme.name} greeting`}
      colors={theme.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 16, overflow: "hidden" }}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        numberOfLines={1}
        style={{ fontSize: 18, letterSpacing: 2, textAlign: "center", opacity: 0.95 }}
      >
        {theme.ornament}
      </Text>
      <Text
        style={{
          marginTop: 10,
          textAlign: "center",
          fontFamily: fonts.display,
          fontSize: 22,
          lineHeight: 28,
          color: theme.ink,
        }}
      >
        {greetingLine(theme.greeting, name)}
      </Text>
      <Text
        style={{
          marginTop: 4,
          textAlign: "center",
          fontFamily: fonts.body,
          fontSize: 13,
          color: theme.ink,
          opacity: 0.85,
        }}
      >
        Wish your matches with a {theme.name} story
      </Text>
      {onStory && (
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={`Post a ${theme.name} story`}
          onPress={onStory}
          containerStyle={{ alignSelf: "center", marginTop: 12 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(255,255,255,0.18)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.45)",
            borderRadius: radius.pill,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <Ionicons name="add-circle-outline" size={16} color={theme.ink} />
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: theme.ink }}>
            Post a {theme.name} story
          </Text>
        </PressScale>
      )}
    </LinearGradient>
  );
}
