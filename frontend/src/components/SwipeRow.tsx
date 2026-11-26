import { useEffect, useRef, type ReactNode } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { palette } from "../theme";

/** Room for the two buttons that slide out from the right. */
const REVEAL = 132;

/** The row that is open right now. Opening another row closes it first. */
let closeOpenRow: (() => void) | null = null;

/**
 * A row that slides left to show two buttons, the way Instagram's notifications
 * do: ••• for more options, and a bin to delete the row from this phone.
 * Only one row is open at a time.
 */
export function SwipeRow({
  children,
  onMore,
  onDelete,
}: {
  children: ReactNode;
  onMore: () => void;
  onDelete: () => void;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const closeMe = useRef(() => {
    isOpen.current = false;
    Animated.spring(x, {
      toValue: 0,
      useNativeDriver: true,
      friction: 9,
      tension: 80,
    }).start();
  }).current;

  const settle = (open: boolean) => {
    if (open) {
      if (closeOpenRow && closeOpenRow !== closeMe) closeOpenRow();
      closeOpenRow = closeMe;
      isOpen.current = true;
      Animated.spring(x, {
        toValue: -REVEAL,
        useNativeDriver: true,
        friction: 9,
        tension: 80,
      }).start();
    } else {
      if (closeOpenRow === closeMe) closeOpenRow = null;
      closeMe();
    }
  };

  // A row that unmounts while open must not stay the "open" one.
  useEffect(
    () => () => {
      if (closeOpenRow === closeMe) closeOpenRow = null;
    },
    [closeMe],
  );

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        // Starting to drag this row closes whichever other row is open.
        if (closeOpenRow && closeOpenRow !== closeMe) closeOpenRow();
      },
      onPanResponderMove: (_, g) => {
        const base = isOpen.current ? -REVEAL : 0;
        x.setValue(Math.min(0, Math.max(-REVEAL, base + g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        const base = isOpen.current ? -REVEAL : 0;
        settle(base + g.dx < -REVEAL / 2);
      },
      onPanResponderTerminate: () => settle(isOpen.current),
    }),
  ).current;

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More options"
          onPress={() => {
            settle(false);
            onMore();
          }}
          style={[styles.action, styles.more]}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete notification"
          onPress={() => {
            settle(false);
            onDelete();
          }}
          style={[styles.action, styles.delete]}
        >
          <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
      <Animated.View
        {...pan.panHandlers}
        style={{ transform: [{ translateX: x }], backgroundColor: palette.paperBase }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  actions: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: REVEAL,
    flexDirection: "row",
  },
  action: { flex: 1, alignItems: "center", justifyContent: "center" },
  more: { backgroundColor: "#5B5478" },
  delete: { backgroundColor: "#E53E3E" },
});
