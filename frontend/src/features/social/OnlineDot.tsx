import { View } from "react-native";

import { palette } from "../../theme";

/** The green dot on a photo: this member is online right now. */
export function OnlineDot({ size = 12, inset = 0 }: { size?: number; inset?: number }) {
  return (
    <View
      accessibilityLabel="Online"
      style={{
        position: "absolute",
        right: inset,
        bottom: inset,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.emerald,
        borderWidth: 2,
        borderColor: "#FFFFFF",
      }}
    />
  );
}
