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
 * screen only has to leave room on the correct edge - useNavInset() gives
 * it that padding without each screen inventing its own number.
 *
 * The active tab has a small indicator that slides from one tab to the next
 * (a spring), instead of jumping. Each tab reports where it sits, and the
 * indicator moves to the active one.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, View, TouchableOpacity, StyleSheet, Text } from "react-native";
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
  { icon: "game-controller-outline", activeIcon: "game-controller", label: "Games", screen: "games" },
  { icon: "search-outline", activeIcon: "search", label: "Search", screen: "find" },
  { icon: "chatbubble-outline", activeIcon: "chatbubble", label: "Chats", screen: "chats" },
  { icon: "person-outline", activeIcon: "person", label: "Profile", screen: "profile" },
] as const;

/** The sliding indicator: a short line on the bar's top edge, or on the rail's left edge. */
const BAR_INDICATOR = { width: 30, height: 3 };
const RAIL_INDICATOR = { width: 3, height: 26 };

type Box = { x: number; y: number; width: number; height: number };

function NavItem({
  icon,
  activeIcon,
  label,
  isActive,
  isWide,
  activeColor,
  inactiveColor,
  onPress,
  onBox,
}: {
  icon: string;
  activeIcon: string;
  label: string;
  isActive: boolean;
  isWide: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
  onBox: (box: Box) => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
      onPress={onPress}
      onLayout={(event) => onBox(event.nativeEvent.layout)}
      style={[
        { alignItems: "center", justifyContent: "center" },
        // In a bar the items share the width. In a rail they are a
        // stack of fixed-height targets, not stretched down the screen.
        isWide ? styles.railItem : { flex: 1 },
      ]}
    >
      <Ionicons name={(isActive ? activeIcon : icon) as any} size={24} color={isActive ? activeColor : inactiveColor} />
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
}

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

  // Where each tab sits inside the bar or rail, reported by the tabs themselves.
  const boxes = useRef<Record<string, Box>>({});
  const [layoutVersion, setLayoutVersion] = useState(0);
  const onBox = useCallback((screen: string, box: Box) => {
    const known = boxes.current[screen];
    if (known && known.x === box.x && known.y === box.y && known.width === box.width && known.height === box.height) return;
    boxes.current[screen] = box;
    setLayoutVersion((version) => version + 1);
  }, []);

  const along = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const activeIndex = DESTINATIONS.findIndex((destination) => destination.screen === active);

  useEffect(() => {
    const box = boxes.current[active];
    if (!box) return;
    // Bar: centred under the tab, along the x axis. Rail: centred beside the tab, along y.
    const target = isWide
      ? box.y + box.height / 2 - RAIL_INDICATOR.height / 2
      : box.x + box.width / 2 - BAR_INDICATOR.width / 2;
    if (!placed.current) {
      placed.current = true;
      along.setValue(target);
      return;
    }
    Animated.spring(along, { toValue: target, useNativeDriver: true, bounciness: 6, speed: 18 }).start();
  }, [active, isWide, layoutVersion, along]);

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
      <Animated.View
        pointerEvents="none"
        style={[
          isWide ? styles.railIndicator : styles.barIndicator,
          { backgroundColor: activeColor, opacity: activeIndex >= 0 ? 1 : 0 },
          { transform: [isWide ? { translateY: along } : { translateX: along }] },
        ]}
      />
      {DESTINATIONS.map((destination) => (
        <NavItem
          key={destination.screen}
          icon={destination.icon}
          activeIcon={destination.activeIcon}
          label={destination.label}
          isActive={active === destination.screen}
          isWide={isWide}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          onPress={() => navigate(destination.screen)}
          onBox={(box) => onBox(destination.screen, box)}
        />
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
  barIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    width: BAR_INDICATOR.width,
    height: BAR_INDICATOR.height,
    borderRadius: 2,
  },
  railIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    width: RAIL_INDICATOR.width,
    height: RAIL_INDICATOR.height,
    borderRadius: 2,
  },
});
