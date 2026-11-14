/**
 * The offer popup: "50% OFF" on screen each time the app opens, until the
 * member closes it.
 *
 * It springs in, sends a burst of sparks (or diyas, hearts, colours) out
 * from the middle, the headline pulses, a shine sweeps across, the time
 * left ticks down and the coupon sits on a ticket ready to use.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Modal, Platform, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { fonts, radius } from "../../theme";
import { PressScale } from "../../components/motion";
import { countdown, type Promo, promoStyle } from "./styles";

/** The card itself. `still` draws it without motion (the admin's preview). */
export function PromoCard({
  promo,
  still,
  onCta,
  onClose,
}: {
  promo: Promo;
  still?: boolean;
  onCta?: () => void;
  onClose?: () => void;
}) {
  const style = promoStyle(promo.style);
  const [left, setLeft] = useState(() => countdown(promo.endsAt));
  const [copied, setCopied] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!promo.endsAt) return;
    const timer = setInterval(() => setLeft(countdown(promo.endsAt)), 1000);
    return () => clearInterval(timer);
  }, [promo.endsAt]);

  useEffect(() => {
    if (still) return;
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    beat.start();
    sweep.start();
    return () => {
      beat.stop();
      sweep.stop();
    };
  }, [still, pulse, shine]);

  const copy = async () => {
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard && promo.couponCode) {
        await navigator.clipboard.writeText(promo.couponCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // The code is on the ticket to read.
    }
  };

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-260, 420] });

  return (
    <LinearGradient
      colors={style.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: "100%", borderRadius: 26, paddingTop: 26, paddingBottom: 20, paddingHorizontal: 20, overflow: "hidden", alignItems: "center" }}
    >
      {!still && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -40,
            bottom: -40,
            width: 70,
            backgroundColor: "rgba(255,255,255,0.16)",
            transform: [{ translateX: shineX }, { rotate: "20deg" }],
          }}
        />
      )}
      {onClose && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close offer"
          onPress={onClose}
          hitSlop={12}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: "rgba(0,0,0,0.25)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={20} color={style.ink} />
        </Pressable>
      )}

      <Text style={{ fontSize: 22, letterSpacing: 4 }}>{style.burst.join("  ")}</Text>
      <Animated.Text
        accessibilityRole="header"
        style={{
          marginTop: 8,
          fontFamily: fonts.display,
          fontSize: 50,
          lineHeight: 58,
          color: style.ink,
          textAlign: "center",
          transform: [{ scale }],
        }}
      >
        {promo.headline}
      </Animated.Text>
      {!!promo.title && (
        <Text style={{ marginTop: 4, fontFamily: fonts.bodySemi, fontSize: 18, color: style.ink, textAlign: "center" }}>
          {promo.title}
        </Text>
      )}
      {!!promo.message && (
        <Text style={{ marginTop: 6, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: style.ink, opacity: 0.88, textAlign: "center" }}>
          {promo.message}
        </Text>
      )}

      {!!left && (
        <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.25)", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Ionicons name="time-outline" size={15} color={style.ink} />
          <Text accessibilityLabel={`Ends in ${left}`} style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: style.ink, letterSpacing: 1 }}>
            Ends in {left}
          </Text>
        </View>
      )}

      {!!promo.couponCode && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Coupon ${promo.couponCode}${Platform.OS === "web" ? ", tap to copy" : ""}`}
          onPress={() => void copy()}
          style={{
            marginTop: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: style.accent,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: "rgba(255,255,255,0.08)",
          }}
        >
          <Text style={{ fontSize: 18 }}>🎟️</Text>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 20, letterSpacing: 2, color: style.ink }}>{promo.couponCode}</Text>
          {Platform.OS === "web" && (
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: style.accent }}>{copied ? "Copied" : "Copy"}</Text>
          )}
        </Pressable>
      )}

      {onCta && (
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={promo.buttonLabel || "Get Premium"}
          onPress={onCta}
          containerStyle={{ marginTop: 18, alignSelf: "stretch" }}
          style={{
            backgroundColor: style.accent,
            borderRadius: radius.pill,
            paddingVertical: 15,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          <Ionicons name="sparkles" size={18} color={style.accentInk} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: style.accentInk }}>
            {promo.buttonLabel || "Get Premium"}
          </Text>
        </PressScale>
      )}
      {onClose && (
        <Pressable accessibilityRole="button" accessibilityLabel="Not now" onPress={onClose} hitSlop={8} style={{ marginTop: 12 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: style.ink, opacity: 0.75 }}>Not now</Text>
        </Pressable>
      )}
    </LinearGradient>
  );
}

/** Sparks flying out from the middle as the popup opens. */
function Burst({ emojis }: { emojis: string[] }) {
  const progress = useRef(new Animated.Value(0)).current;
  const bits = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
        const distance = 140 + Math.random() * 90;
        return { dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance, emoji: emojis[i % emojis.length] ?? "✨", size: 16 + Math.random() * 14 };
      }),
    [emojis],
  );
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [progress]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: "50%", left: "50%" }}>
      {bits.map((bit, i) => (
        <Animated.Text
          key={i}
          style={{
            position: "absolute",
            fontSize: bit.size,
            opacity: progress.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, bit.dx] }) },
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, bit.dy] }) },
              { scale: progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.2, 0.8] }) },
            ],
          }}
        >
          {bit.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

/** The popup over the app. The host decides when it shows. */
export function PromoPopup({
  promo,
  visible,
  onClose,
  onCta,
}: {
  promo: Promo;
  visible: boolean;
  onClose: () => void;
  onCta: () => void;
}) {
  const style = promoStyle(promo.style);
  const enter = useRef(new Animated.Value(0)).current;
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(setCalm)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!visible) return;
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
  }, [visible, enter]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close offer"
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(10, 10, 20, 0.62)" }}
        />
        {!calm && visible && <Burst emojis={style.burst} />}
        <Animated.View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 400,
            opacity: enter,
            transform: [
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              { rotate: enter.interpolate({ inputRange: [0, 1], outputRange: ["-6deg", "0deg"] }) },
            ],
          }}
        >
          <PromoCard promo={promo} still={calm} onCta={onCta} onClose={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}
