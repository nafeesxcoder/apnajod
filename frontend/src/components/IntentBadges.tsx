import { Text, View } from "react-native";
import { intentBadges, type IntentBadgeInput } from "../domain/intentBadges";
import { fonts, palette, radius } from "../theme";

/** The intent chips for one profile. Renders nothing when there are none. */
export function IntentBadges({
  input,
  marginTop = 10,
  center = false,
}: {
  input: IntentBadgeInput;
  marginTop?: number;
  /** Centre the chips, for profiles laid out down the middle. */
  center?: boolean;
}) {
  const badges = intentBadges(input);
  if (!badges.length) return null;
  return (
    <View
      accessibilityLabel={`What they want: ${badges.map((b) => b.label.replace(/^\S+\s/, "")).join(", ")}`}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: center ? "center" : "flex-start",
        gap: 6,
        marginTop,
      }}
    >
      {badges.map((badge) => (
        <View
          key={badge.key}
          style={{
            borderRadius: radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: palette.paperSand,
            borderWidth: 1,
            borderColor: palette.rule,
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.ink }}>
            {badge.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
