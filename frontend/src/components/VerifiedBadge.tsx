import { MaterialIcons } from "@expo/vector-icons";
import { View, type StyleProp, type ViewStyle } from "react-native";

/** Instagram-style blue badge shown once an admin approves the selfie. */
export const VERIFIED_BLUE = "#0095F6";

export function VerifiedBadge({
  size = 20,
  style,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessible
      accessibilityLabel="Verified"
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
      {/* White disc behind the icon so the tick reads white on any background. */}
      <View
        style={{
          position: "absolute",
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: size,
          backgroundColor: "#FFFFFF",
        }}
      />
      <MaterialIcons name="verified" size={size} color={VERIFIED_BLUE} />
    </View>
  );
}
