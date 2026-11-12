import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { View, type StyleProp, type ViewStyle } from "react-native";

/**
 * The two trust marks a member can carry.
 *
 *   Real       green shield - an admin approved their selfie. Free.
 *   Blue tick  the Instagram-style tick - approved selfie AND Pro.
 *
 * The server decides both. `blueTick` is only ever true for someone who is
 * also verified, so a member who pays without a verified selfie shows
 * nothing until the selfie is approved - nobody can buy "this person is
 * real". Nothing renders for an unverified member, even if a caller forgets
 * to check first.
 */
export const BLUE_TICK = "#0095F6";
export const REAL_GREEN = "#1E9E5A";

export function TrustBadge({
  verified = true,
  blueTick = false,
  size = 20,
  style,
}: {
  verified?: boolean;
  blueTick?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  if (!verified) return null;
  const tick = blueTick === true;
  const color = tick ? BLUE_TICK : REAL_GREEN;
  return (
    <View
      accessible
      accessibilityLabel={tick ? "Blue tick, verified member" : "Real, selfie verified"}
      style={[
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {/* White disc behind the icon so the mark reads white on any background. */}
      <View
        style={{
          position: "absolute",
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: size,
          backgroundColor: "#FFFFFF",
        }}
      />
      {tick ? (
        <MaterialIcons name="verified" size={size} color={color} />
      ) : (
        <MaterialCommunityIcons name="shield-check" size={size} color={color} />
      )}
    </View>
  );
}
