import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { brand, whiteCard } from "./brand";
import { fonts, palette } from "../theme";

/**
 * An information card in the Navy x Crimson look: white, soft shadow, a
 * thin navy-to-crimson bar along the top, and a title. Used for About,
 * Looking for and the like on every profile screen.
 */
export function InfoCard({
  title,
  right,
  children,
  style,
}: {
  title: string;
  /** Something small on the title's right (an edit button, a count). */
  right?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ ...whiteCard, overflow: "hidden" }, style]}>
      <LinearGradient colors={brand.barGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 4 }} />
      <View style={{ padding: 16, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 18, color: palette.ink }}>
            {title}
          </Text>
          {right}
        </View>
        {children}
      </View>
    </View>
  );
}
