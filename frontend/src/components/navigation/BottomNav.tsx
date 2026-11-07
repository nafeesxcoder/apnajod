/**
 * The app's main navigation.
 *
 * A bottom bar on a phone, a left rail on anything wider. Both are the
 * same five destinations and the same component, because two components
 * would drift: a tab added to one and forgotten in the other is the
 * ordinary way a responsive app ends up with different navigation
 * depending on the window.
 *
 * It positions itself absolutely inside whichever screen renders it, so a
 * screen only has to leave room on the correct edge - railInset() below
 * gives it that padding without each screen inventing its own number.
 */
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RAIL_WIDTH } from "../../layout/breakpoints";
import { useLayout } from "../../layout/useLayout";

export function handleBottomNavScroll(_event?: any) {
  return;
}

/**
 * The padding a screen needs so the nav does not sit on top of it: on the
 * left when the nav is a rail, on the bottom when it is a bar.
 */
export function useNavInset() {
  const { isWide } = useLayout();
  return isWide
    ? { paddingLeft: RAIL_WIDTH, paddingBottom: 0 }
    : { paddingLeft: 0, paddingBottom: 72 };
}

const DESTINATIONS = [
  { icon: "home-outline", activeIcon: "home", label: "Home", screen: "home" },
  { icon: "heart-outline", activeIcon: "heart", label: "Likes", screen: "likes" },
  { icon: "search-outline", activeIcon: "search", label: "Search", screen: "find" },
  { icon: "chatbubble-outline", activeIcon: "chatbubble", label: "Chats", screen: "chats" },
  { icon: "person-outline", activeIcon: "person", label: "Profile", screen: "profile" },
] as const;

export function BottomNav({
  active,
  navigate,
  light,
}: {
  active: string;
  navigate: (screen: any) => void;
  light?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();

  const activeColor = light ? "#FFFFFF" : "#151719";
  const inactiveColor = light ? "rgba(255,255,255,0.6)" : "#9AA4AF";

  const NavItem = ({ icon, label, screen, activeIcon }: any) => {
    const isActive = active === screen;
    return (
      <TouchableOpacity
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={label}
        onPress={() => navigate(screen)}
        style={[
          { alignItems: "center", justifyContent: "center" },
          // In a bar the items share the width. In a rail they are a
          // stack of fixed-height targets, not stretched down the screen.
          isWide ? styles.railItem : { flex: 1 },
          isWide && isActive && styles.railItemOn,
        ]}
      >
        <Ionicons
          name={isActive ? activeIcon : icon}
          size={24}
          color={isActive ? activeColor : inactiveColor}
        />
        <Text
          style={{
            fontSize: isWide ? 11 : 10,
            marginTop: 4,
            color: isActive ? activeColor : inactiveColor,
            fontWeight: isActive ? "600" : "400",
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        isWide ? styles.rail : styles.container,
        isWide ? null : { paddingBottom: insets.bottom || 10 },
        isWide ? { paddingTop: insets.top + 16 } : null,
        light &&
          (isWide
            ? { backgroundColor: "rgba(0,0,0,0.5)", borderRightColor: "transparent" }
            : { backgroundColor: "rgba(0,0,0,0.5)", borderTopColor: "transparent" }),
      ]}
    >
      {DESTINATIONS.map((destination) => (
        <NavItem key={destination.screen} {...destination} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#D3D6DA",
    paddingTop: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  rail: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 6,
    width: RAIL_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#D3D6DA",
    paddingHorizontal: 8,
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
  },
  railItem: {
    paddingVertical: 14,
    borderRadius: 14,
  },
  railItemOn: {
    backgroundColor: "#EEF2F6",
  },
});
