import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { brand } from "../../components/brand";
import { palette } from "../../theme";
import { openStoriesOf, useCloseUnseen, useStoryStatus } from "./storyStore";
import { CLOSE_GREEN } from "./CloseFriendsSheet";

/**
 * A ring round someone's photo while they have a story up (colour: one you
 * have not watched; grey: watched), like Instagram. Tapping the photo plays
 * their story. With no story up the photo is shown as it is.
 */
export function StoryRing({ userId, size, children }: { userId: string | null | undefined; size: number; children: ReactNode }) {
  const status = useStoryStatus(userId);
  const close = useCloseUnseen(userId);
  if (status === "none" || !userId) return <>{children}</>;
  const gap = Math.max(2, Math.round(size * 0.05));
  const ring = Math.max(2, Math.round(size * 0.06));
  const inner = (
    <View style={{ padding: gap, borderRadius: size, backgroundColor: palette.paper }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}>{children}</View>
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status === "new" ? "Watch their new story" : "Watch their story"}
      onPress={() => openStoriesOf(userId)}
      hitSlop={4}
    >
      {status === "new" && close ? (
        // A Close friends story you have not watched: green, like Instagram.
        <View style={{ padding: ring, borderRadius: size, backgroundColor: CLOSE_GREEN }}>{inner}</View>
      ) : status === "new" ? (
        <LinearGradient
          colors={[brand.barGradient[1], brand.barGradient[0]]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={{ padding: ring, borderRadius: size }}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View style={{ padding: ring, borderRadius: size, backgroundColor: palette.rule }}>{inner}</View>
      )}
    </Pressable>
  );
}
