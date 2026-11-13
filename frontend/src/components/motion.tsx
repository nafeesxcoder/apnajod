import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { brand } from "./brand";

/**
 * The app's motion, built on React Native's own Animated (no extra
 * library), so it runs the same on web, Android and iOS.
 *
 * Everything here stands still when the phone asks for less motion
 * (Settings > Accessibility > Reduce motion / Remove animations).
 */
const nativeDriver = Platform.OS !== "web";

/** True when the member has asked their phone for less motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => live && setReduced(!!value))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (value: boolean) =>
      setReduced(!!value),
    );
    return () => {
      live = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}

/**
 * Fades a card up into place when it first appears. Give each card on a
 * screen a growing `delay` (0, 80, 160...) and they arrive one after
 * another.
 */
export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const run = Animated.timing(progress, {
      toValue: 1,
      duration: 480,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    });
    run.start();
    return () => run.stop();
  }, [reduced, delay, progress]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * A Pressable that sinks a little while held, so every card and button
 * answers the finger.
 */
export function PressScale({
  children,
  style,
  containerStyle,
  scaleTo = 0.97,
  ...props
}: PressableProps & {
  children: ReactNode;
  /** The look of the thing that sinks (background, padding, radius...). */
  style?: StyleProp<ViewStyle>;
  /** Its place in the layout (width in a grid, margins). */
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: nativeDriver, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      {...props}
      style={containerStyle}
      onPressIn={(event) => {
        if (!reduced) to(scaleTo);
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!reduced) to(1);
        props.onPressOut?.(event);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Repeats an animation for as long as the component is on screen. */
function useLoop(make: (value: Animated.Value) => Animated.CompositeAnimation, reduced: boolean) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(make(value));
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);
  return value;
}

/**
 * A photo in a slowly turning navy/crimson ring. `children` is the photo
 * (or initial), sized to `size - 2 * thickness`.
 */
export function SpinRing({
  size,
  thickness = 3,
  children,
  spin = true,
}: {
  size: number;
  thickness?: number;
  children: ReactNode;
  spin?: boolean;
}) {
  const reduced = useReducedMotion();
  const turn = useLoop(
    (v) => Animated.timing(v, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: nativeDriver }),
    reduced || !spin,
  );
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, overflow: "hidden", transform: [{ rotate }] }}
      >
        <LinearGradient colors={brand.ringGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
      </Animated.View>
      <View
        style={{
          position: "absolute",
          top: thickness,
          left: thickness,
          width: size - thickness * 2,
          height: size - thickness * 2,
          borderRadius: (size - thickness * 2) / 2,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** A heart (or any icon) that beats like a heart: two quick pulses, a rest. */
export function HeartBeat({ children, active = true }: { children: ReactNode; active?: boolean }) {
  const reduced = useReducedMotion();
  const beat = useLoop(
    (v) =>
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 160, useNativeDriver: nativeDriver }),
        Animated.timing(v, { toValue: 0.4, duration: 140, useNativeDriver: nativeDriver }),
        Animated.timing(v, { toValue: 0.8, duration: 160, useNativeDriver: nativeDriver }),
        Animated.timing(v, { toValue: 0, duration: 240, useNativeDriver: nativeDriver }),
        Animated.delay(900),
      ]),
    reduced || !active,
  );
  const scale = beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

/**
 * A soft ring that grows out from behind a button and fades - the "tap me"
 * glow on Like. Put it as the first child of a button with `overflow`
 * left visible; it sizes itself to the parent.
 */
export function GlowPulse({
  color,
  radius,
  spread = 1.45,
}: {
  color: string;
  radius: number;
  /** How far it grows. A round button takes the default; a wide pill ~1.12. */
  spread?: number;
}) {
  const reduced = useReducedMotion();
  const pulse = useLoop(
    (v) =>
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.delay(500),
      ]),
    reduced,
  );
  if (reduced) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: radius,
        backgroundColor: color,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, spread] }) }],
      }}
    />
  );
}
