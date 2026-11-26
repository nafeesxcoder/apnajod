/**
 * The app's main navigation.
 *
 * On a phone it is a floating glassmorphism bar: a frosted, blurred pill with
 * a soft glass lens that sits under the chosen tab. You can tap a
 * tab, or slide the lens along the bar with a finger and let go on the tab you
 * want. On a laptop it is a left rail with the same five destinations.
 *
 * It positions itself absolutely inside whichever screen renders it, so a
 * screen only has to leave room on the correct edge - useNavInset() gives
 * it that padding without each screen inventing its own number.
 */
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette } from "../../theme";
import { useNavPhoto } from "./navPhoto";
import { RAIL_WIDTH } from "../../layout/breakpoints";
import { useLayout } from "../../layout/useLayout";

export function handleBottomNavScroll(_event?: any) {
  return;
}

/** Space the bar takes above the bottom edge, plus its own height. */
const BAR_HEIGHT = 64;
const BAR_GAP = 10;
/** Padding inside the bar on each side, and the lens's inset from its slot. */
const PAD = 6;
const LENS_INSET = 4;

/**
 * The padding a screen needs so the nav does not sit on top of it: on the
 * left when the nav is a rail, on the bottom when it is a bar.
 */
export function useNavInset() {
  const { isWide } = useLayout();
  return isWide
    ? { paddingLeft: RAIL_WIDTH, paddingBottom: 0 }
    : { paddingLeft: 0, paddingBottom: BAR_HEIGHT + BAR_GAP + 8 };
}

const DESTINATIONS = [
  { icon: "home-outline", activeIcon: "home", label: "Home", screen: "home" },
  { icon: "game-controller-outline", activeIcon: "game-controller", label: "Games", screen: "games" },
  { icon: "search-outline", activeIcon: "search", label: "Search", screen: "find" },
  { icon: "chatbubble-outline", activeIcon: "chatbubble", label: "Chats", screen: "chats" },
  { icon: "person-outline", activeIcon: "person", label: "Profile", screen: "profile" },
] as const;

/** Left edge of the lens for a tab, given the width of one tab's slot. */
function lensLeft(index: number, slot: number) {
  return PAD + index * slot + LENS_INSET;
}

function NavItem({
  icon,
  activeIcon,
  label,
  isActive,
  isWide,
  activeColor,
  inactiveColor,
  onPress,
  photo,
  ring = false,
}: {
  icon: string;
  activeIcon: string;
  label: string;
  isActive: boolean;
  isWide: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
  /** The member's own photo, shown instead of the icon on the Profile tab. */
  photo?: string | null;
  /** The Profile tab always shows a round circle: the photo, or an icon until there is one. */
  ring?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        { alignItems: "center", justifyContent: "center" },
        // In a bar the items share the width. In a rail they are a
        // stack of fixed-height targets, not stretched down the screen.
        isWide ? styles.railItem : { flex: 1, height: "100%" },
      ]}
    >
      {ring && !isWide ? (
        <View style={[styles.photoRing, { borderColor: isActive ? activeColor : "rgba(176,36,95,0.35)" }]}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            <Ionicons
              name={(isActive ? "person" : "person-outline") as any}
              size={16}
              color={isActive ? activeColor : inactiveColor}
            />
          )}
        </View>
      ) : (
        <View style={styles.iconBox}>
          <Ionicons
            name={(isActive ? activeIcon : icon) as any}
            size={isWide ? 24 : 22}
            color={isActive ? activeColor : inactiveColor}
          />
        </View>
      )}
      {/* Labels only on the laptop rail; the phone bar shows icons alone. */}
      {isWide && (
        <Text
          style={{
            fontSize: 11,
            marginTop: 3,
            color: isActive ? activeColor : inactiveColor,
            fontWeight: isActive ? "600" : "400",
          }}
        >
          {label}
        </Text>
      )}
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

  const photo = useNavPhoto();
  const activeIdx = DESTINATIONS.findIndex((destination) => destination.screen === active);
  const activeColor = light ? "#FFFFFF" : palette.navy;
  const inactiveColor = light ? "rgba(255,255,255,0.6)" : palette.slate;

  // ---- liquid bar: the lens and the slide gesture -----------------------
  const [width, setWidth] = useState(0);
  const slot = width ? (width - PAD * 2) / DESTINATIONS.length : 0;
  const lens = useRef(new Animated.Value(0)).current;
  const lensValue = useRef(0);
  const dragging = useRef(false);
  const startX = useRef(0);
  const [preview, setPreview] = useState<number | null>(null);

  useEffect(() => {
    const id = lens.addListener(({ value }) => {
      lensValue.current = value;
    });
    return () => lens.removeListener(id);
  }, [lens]);

  // Latest values for the gesture handlers, which are created once.
  const latest = useRef({ slot, activeIdx, navigate });
  latest.current = { slot, activeIdx, navigate };

  const snapTo = (index: number) => {
    const { slot: s } = latest.current;
    if (!s || index < 0) return;
    Animated.spring(lens, {
      toValue: lensLeft(index, s),
      useNativeDriver: Platform.OS !== "web",
      friction: 9,
      tension: 110,
    }).start();
  };

  // Keep the lens on the chosen tab (after a tap, a slide, or a change elsewhere).
  useEffect(() => {
    if (!slot || dragging.current || activeIdx < 0) return;
    snapTo(activeIdx);
  }, [slot, activeIdx]);

  const pan = useRef(
    PanResponder.create({
      // Only a clearly horizontal drag takes the gesture; a tap still reaches the tab.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        dragging.current = true;
        startX.current = lensValue.current;
        lens.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        const { slot: s } = latest.current;
        if (!s) return;
        const min = lensLeft(0, s);
        const max = lensLeft(DESTINATIONS.length - 1, s);
        const next = Math.min(max, Math.max(min, startX.current + g.dx));
        lens.setValue(next);
        const index = Math.round((next - min) / s);
        setPreview((current) => (current === index ? current : index));
      },
      onPanResponderRelease: (_, g) => {
        const { slot: s, activeIdx: current, navigate: go } = latest.current;
        dragging.current = false;
        setPreview(null);
        if (!s) return;
        const min = lensLeft(0, s);
        const max = lensLeft(DESTINATIONS.length - 1, s);
        const next = Math.min(max, Math.max(min, startX.current + g.dx));
        const index = Math.round((next - min) / s);
        snapTo(index);
        const target = DESTINATIONS[index];
        if (target && index !== current) go(target.screen);
      },
      onPanResponderTerminate: () => {
        dragging.current = false;
        setPreview(null);
        snapTo(latest.current.activeIdx);
      },
    }),
  ).current;

  if (isWide) {
    return (
      <View style={[styles.rail, { paddingTop: insets.top + 16 }, light && { backgroundColor: "rgba(0,0,0,0.5)", borderRightColor: "transparent" }]}>
        {DESTINATIONS.map((destination, index) => (
          <NavItem
            key={destination.screen}
            icon={destination.icon}
            activeIcon={destination.activeIcon}
            label={destination.label}
            isActive={index === activeIdx}
            isWide
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            onPress={() => navigate(destination.screen)}
          />
        ))}
      </View>
    );
  }

  // While a finger slides the lens, the tab under it shows as selected.
  const highlight = preview ?? activeIdx;

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      {...pan.panHandlers}
      style={[styles.bar, { bottom: Math.max(insets.bottom, 0) + BAR_GAP }]}
    >
      {/* Frosted glass: a real blur on the phone and on the web. */}
      <View style={styles.glass}>
        <BlurView intensity={light ? 45 : 70} tint={light ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, light ? styles.tintLight : styles.tint]} />
      </View>
      {slot > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.lens,
            light && styles.lensLight,
            {
              width: slot - LENS_INSET * 2,
              opacity: activeIdx < 0 && preview === null ? 0 : 1,
              transform: [{ translateX: lens }],
            },
          ]}
        />
      )}
      <View style={styles.items}>
        {DESTINATIONS.map((destination, index) => (
          <NavItem
            key={destination.screen}
            icon={destination.icon}
            activeIcon={destination.activeIcon}
            label={destination.label}
            isActive={index === highlight}
            isWide={false}
            photo={destination.screen === "profile" ? photo : null}
            ring={destination.screen === "profile"}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            onPress={() => navigate(destination.screen)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The floating glass bar: translucent, rounded, with a soft shadow.
  bar: {
    position: "absolute",
    left: 14,
    right: 14,
    height: BAR_HEIGHT,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#3A1A5E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  barLight: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  // The highlight along the top of the glass, which gives it the liquid look.
  sheen: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    height: 30,
    borderTopLeftRadius: 31,
    borderTopRightRadius: 31,
  },
  // The frosted glass behind the bar, clipped to its rounded shape.
  glass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: "hidden",
  },
  tint: {
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  tintLight: {
    backgroundColor: "rgba(20,16,46,0.35)",
  },
  // The glass lens that slides under the chosen tab.
  lens: {
    position: "absolute",
    top: 7,
    bottom: 7,
    left: 0,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    shadowColor: "#B0245F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  lensLight: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  items: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: PAD,
  },
  rail: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 6,
    width: RAIL_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E7D8EE",
    paddingHorizontal: 8,
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
  },
  railItem: {
    paddingVertical: 12,
  },
  // The Profile tab's photo, in a ring that lights up when the tab is chosen.
  photoRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  iconBox: {
    width: 44,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
