/**
 * Festival wishes in chat. While a theme is on, a chip above the message
 * box sends a match a festive card in one tap ("🪔 Happy Diwali"); the
 * card shows in the theme's colours on both sides.
 */
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { fonts, palette, radius } from "../../theme";
import { PressScale } from "../../components/motion";
import { FESTIVAL_THEMES, type FestivalTheme, type FestivalWishPayload } from "./themes";

export { alreadyWished } from "./themes";

export function FestivalWishChip({ theme, onSend }: { theme: FestivalTheme; onSend: () => void }) {
  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8, backgroundColor: palette.paperBase }}>
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={`Send a ${theme.name} wish`}
        onPress={onSend}
        containerStyle={{ alignSelf: "flex-start" }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: theme.colors[0],
          borderRadius: radius.pill,
          paddingHorizontal: 14,
          paddingVertical: 8,
        }}
      >
        <Text style={{ fontSize: 15 }}>{theme.emoji}</Text>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: theme.ink }}>Send a {theme.name} wish</Text>
      </PressScale>
    </View>
  );
}

/** The card in the chat. A theme that has since gone keeps a plain look. */
export function FestivalWishCard({ wish, mine }: { wish: FestivalWishPayload; mine: boolean }) {
  const theme = FESTIVAL_THEMES[wish.themeKey];
  const colors: [string, string] = theme ? theme.colors : [palette.crimson, "#1F4D7A"];
  const ink = theme?.ink ?? "#FFFFFF";
  return (
    <LinearGradient
      accessibilityLabel={`${mine ? "You sent" : "Festival wish"}: ${wish.greeting}`}
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: 230, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 14, alignItems: "center" }}
    >
      <Text style={{ fontSize: 20, letterSpacing: 2 }} numberOfLines={1}>
        {theme?.ornament ?? "✨  💌  ✨"}
      </Text>
      <Text style={{ marginTop: 10, textAlign: "center", fontFamily: fonts.display, fontSize: 21, lineHeight: 27, color: ink }}>
        {wish.greeting}
      </Text>
      <Text style={{ marginTop: 6, textAlign: "center", fontFamily: fonts.body, fontSize: 12, color: ink, opacity: 0.85 }}>
        {mine ? "Your wish" : "A wish for you"}
      </Text>
    </LinearGradient>
  );
}
