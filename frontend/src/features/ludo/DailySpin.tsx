/**
 * The daily spinner: once every 24 hours it pops up when the app opens.
 * Spin it for coins, a Spark, or now and then something from the Ludo
 * store for free. The server picks the prize; the wheel shows it.
 */
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { coinsApi, type SpinPrize } from "../../api/coinsApi";
import { Modal } from "../../components/BackModal";
import { fonts } from "../../theme";
import { Confetti } from "./LudoBits";
import { spinLanding } from "./ludoText";
import { walletStore } from "./walletStore";

const SLICE_COLORS = ["#F43F5E", "#F59E0B", "#22C55E", "#3B82F6", "#A855F7", "#EC4899", "#14B8A6", "#EAB308"];
const SIZE = 290;

let openSpin: (() => void) | null = null;
/** Open the spinner from anywhere (the Ludo screen, Games). */
export const showDailySpin = () => openSpin?.();

function prizeText(prize: SpinPrize) {
  if (prize.kind === "coins") return { big: `+${prize.amount} 🪙`, small: "Coins added to your wallet" };
  if (prize.kind === "credit") return { big: "✨ 1 Spark", small: "A free Spark to send someone special" };
  return { big: "🎁 Free unlock!", small: `${prize.name} (${prize.itemKind}) is yours in the Ludo store` };
}

export function DailySpinHost({ accessToken, auto }: { accessToken: string; auto: boolean }) {
  const [open, setOpen] = useState(false);
  const [slices, setSlices] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<SpinPrize | null>(null);
  const [error, setError] = useState("");
  const angle = useRef(new Animated.Value(0)).current;
  const asked = useRef(false);

  useEffect(() => {
    openSpin = () => {
      const wallet = walletStore.get();
      if (wallet) setSlices(wallet.spinSlices);
      setPrize(null);
      setError("");
      setOpen(true);
    };
    return () => {
      openSpin = null;
    };
  }, []);

  // Once per app open, a little after Home shows: if a spin is ready, offer it.
  useEffect(() => {
    if (!auto || asked.current) return;
    asked.current = true;
    const timer = setTimeout(async () => {
      const wallet = await walletStore.refresh(accessToken);
      if (wallet?.canSpin) {
        setSlices(wallet.spinSlices);
        setOpen(true);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [auto, accessToken]);

  const spin = async () => {
    if (spinning) return;
    setSpinning(true);
    setError("");
    angle.setValue(0);
    // Starts turning at once; slows onto the prize when the server answers.
    const warm = Animated.timing(angle, { toValue: 720, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: false });
    warm.start();
    try {
      const result = await coinsApi.spin(accessToken);
      warm.stop();
      Animated.timing(angle, { toValue: spinLanding(result.slice, slices.length || 8, 5), duration: 3200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
        setPrize(result.prize);
        walletStore.set(result.wallet);
        setSpinning(false);
      });
    } catch (e) {
      warm.stop();
      setSpinning(false);
      setError(e instanceof Error ? e.message : "Could not spin right now.");
    }
  };

  const n = slices.length || 8;
  const R = SIZE / 2;
  const wedge = 2 * R * Math.tan(Math.PI / n);
  const shown = prize ? prizeText(prize) : null;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => !spinning && setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(10,4,30,0.82)", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <LinearGradient colors={["#3A1F86", "#1E0F4D"]} style={{ width: "100%", maxWidth: 380, borderRadius: 28, padding: 20, alignItems: "center", gap: 12, borderWidth: 2, borderColor: "#F6C445" }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 26, color: "#F6C445" }}>Daily Spin 🎡</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: "#C9BDF5", textAlign: "center" }}>One free spin every day. Win coins, Sparks or a surprise from the Ludo store!</Text>

          <View style={{ width: SIZE, height: SIZE + 14, alignItems: "center" }}>
            {/* The pointer. */}
            <View style={{ position: "absolute", top: 0, zIndex: 5, width: 0, height: 0, borderLeftWidth: 13, borderRightWidth: 13, borderTopWidth: 26, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#FFFFFF" }} />
            <Animated.View
              accessibilityLabel="Prize wheel"
              style={{
                marginTop: 12,
                width: SIZE,
                height: SIZE,
                borderRadius: R,
                overflow: "hidden",
                borderWidth: 6,
                borderColor: "#F6C445",
                backgroundColor: "#2B1466",
                transform: [{ rotate: angle.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] }) }],
              }}
            >
              {Array.from({ length: n }, (_, i) => (
                <View key={i} style={{ position: "absolute", left: -6, top: -6, width: SIZE, height: SIZE, alignItems: "center", transform: [{ rotate: `${(i + 0.5) * (360 / n)}deg` }] }}>
                  <View style={{ width: 0, height: 0, borderLeftWidth: wedge / 2, borderRightWidth: wedge / 2, borderTopWidth: R, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                  <Text style={{ position: "absolute", top: R * 0.16, fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 3 }}>
                    {/^\d+$/.test(slices[i] ?? "") ? `🪙${slices[i]}` : slices[i] === "Spark" ? "✨" : "🎁"}
                  </Text>
                </View>
              ))}
              <View style={{ position: "absolute", left: R - 32 - 6, top: R - 32 - 6, width: 64, height: 64, borderRadius: 32, backgroundColor: "#F6C445", borderWidth: 4, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 24 }}>🎲</Text>
              </View>
            </Animated.View>
          </View>

          {shown ? (
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyBold, fontSize: 28, color: "#FFFFFF" }}>
                {shown.big}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: "#C9BDF5", textAlign: "center" }}>{shown.small}</Text>
            </View>
          ) : null}
          {!!error && <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#FDA4AF", textAlign: "center" }}>{error}</Text>}

          {prize || error ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Collect" onPress={() => setOpen(false)} style={{ alignSelf: "stretch" }}>
              <LinearGradient colors={["#4ADE80", "#15803D"]} style={{ borderRadius: 999, paddingVertical: 15, alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: "#FFFFFF" }}>{prize ? "Collect" : "Close"}</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Spin the wheel" disabled={spinning} onPress={() => void spin()} style={{ alignSelf: "stretch" }}>
              <LinearGradient colors={["#FFE9A3", "#C48A12"]} style={{ borderRadius: 999, paddingVertical: 15, alignItems: "center" }}>
                {spinning ? <ActivityIndicator color="#2B1466" /> : <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: "#2B1466" }}>SPIN!</Text>}
              </LinearGradient>
            </Pressable>
          )}
          {!spinning && !prize && (
            <Pressable accessibilityRole="button" accessibilityLabel="Later" onPress={() => setOpen(false)} hitSlop={8}>
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#C9BDF5" }}>Later</Text>
            </Pressable>
          )}
        </LinearGradient>
        {prize && <Confetti />}
      </View>
    </Modal>
  );
}
