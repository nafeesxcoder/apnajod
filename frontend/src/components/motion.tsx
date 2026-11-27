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
 *
 * Fades and slides run on the phone's own animation thread (native driver),
 * so they stay smooth while the app is busy loading.
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
 * Cards just appear. (The slide-and-fade on first show was jerky on the
 * installed Android app, so the app keeps its motion to plain taps.)
 */
export function Reveal({
  children,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={style}>{children}</View>;
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
    Animated.timing(scale, { toValue: value, duration: 90, useNativeDriver: nativeDriver }).start();
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

const FILL: ViewStyle = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 };

/**
 * A button made of glass: a soft gloss on top, a little depth at the bottom and
 * a colored glow under it. No moving shine and no border. Under the finger it
 * swells a little. It keeps the colors you give it, so it is the same button,
 * only glassy.
 */
export function LiquidPress({
  colors,
  children,
  style,
  contentStyle,
  radius = 18,
  bulge = 1.05,
  ...props
}: PressableProps & {
  colors: readonly [string, string, ...string[]];
  children: ReactNode;
  /** The place and shadow of the button (width in a row, margins, shadow). */
  style?: StyleProp<ViewStyle>;
  /** The layout of what is inside (row, padding, gap). */
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  /** How much it swells under the finger. */
  bulge?: number;
}) {
  const reduced = useReducedMotion();
  const swell = useRef(new Animated.Value(1)).current;
  const glow = colors[0];

  return (
    <Pressable
      {...props}
      style={[
        {
          borderRadius: radius,
          backgroundColor: glow,
          shadowColor: glow,
          shadowOpacity: 0.4,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        },
        style,
      ]}
      onPressIn={(event) => {
        if (!reduced) {
          Animated.spring(swell, { toValue: bulge, friction: 5, tension: 140, useNativeDriver: nativeDriver }).start();
        }
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!reduced) {
          Animated.spring(swell, { toValue: 1, friction: 6, tension: 110, useNativeDriver: nativeDriver }).start();
        }
        props.onPressOut?.(event);
      }}
    >
      <Animated.View style={{ borderRadius: radius, overflow: "hidden", transform: [{ scale: swell }] }}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={contentStyle}>
          {children}
        </LinearGradient>
        {/* Depth: the bottom of the glass is a little darker. */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.2)"]}
          start={{ x: 0.5, y: 0.4 }}
          end={{ x: 0.5, y: 1 }}
          style={FILL}
        />
        {/* Gloss on the top half, like light on the surface. */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.38)", "rgba(255,255,255,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: "absolute", top: 0, right: 0, left: 0, height: "50%" }}
        />
      </Animated.View>
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
