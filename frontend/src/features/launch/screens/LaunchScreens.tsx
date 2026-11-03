import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { Brand, Button, shared } from "../../../components";
import { matches } from "../../../data";
import { AppCanvas } from "../../../components/AppCanvas";

const milaanLogo = require("../../../../assets/milaan-logo.png");
const heartImage = require("../../../../assets/heart.png");

/* =========================================================
   PREMIUM BACKGROUND
   ========================================================= */


/* =========================================================
   SPLASH SCREEN
   ========================================================= */

export function SplashScreen() {
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== "web";

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
      ]),
    );
    pulseLoop.start();

    Animated.timing(progress, {
      toValue: 1,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    }).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
      ]),
    );
    floatLoop.start();

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
    };
  }, [float, progress, pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.055],
  });
  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [3, -4],
  });
  const wordsOpacity = progress.interpolate({
    inputRange: [0, 0.16, 0.85, 1],
    outputRange: [0, 1, 1, 0.92],
  });
  const wordsY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  return (
    <AppCanvas>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          className="w-[244px] h-[244px] items-center justify-center"
          style={{ transform: [{ translateY }, { scale }] }}
        >
          <LinearGradient
            colors={["#FFFFFF", "#AA812A", "#690D23"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 232,
              height: 232,
              borderRadius: 38,
              padding: 1.5,
              shadowColor: "#8A1B35",
              shadowOpacity: 0.3,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
            }}
          >
            <View
              className="rounded-[34px] overflow-hidden bg-[#110D0E] border border-white/[.08] items-center justify-center"
              style={{ width: 229, height: 229 }}
            >
              <Image
                source={milaanLogo}
                resizeMode="contain"
                style={{
                  width: 229,
                  height: 229,
                  backgroundColor: "transparent",
                }}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        <Text className="font-bold text-[30px] tracking-[.4px] text-[#161113] mt-[22px]">
          Mil<Text className="text-[#AA812A]">aan</Text>
        </Text>

        <View className="items-center w-[88%] max-w-[420px] mt-[18px] px-[18px] py-3.5 rounded-[22px] bg-white/[.62] border border-[rgba(186,142,47,.30)]">
          <Text className="font-semibold text-[26px] text-[#730F26]">
            For something real.
          </Text>
          <Animated.Text
            className="font-bold text-[15px] leading-[22px] text-[#580B1D] mt-2 text-center tracking-[.15px]"
            style={{
              opacity: wordsOpacity,
              transform: [{ translateY: wordsY }],
            }}
          >
            Slow down. Choose better. Meet with intention.
          </Animated.Text>
          <Text className="font-sans text-[13.5px] text-[#6C0E23] mt-[7px] text-center">
            Thoughtful dating, made personal.
          </Text>

          <View className="flex-row items-center gap-2 mt-[18px] px-[13px] py-2 rounded-[20px] bg-white/[.82] border border-[#D1AE5F] flex-nowrap">
            <View className="w-1 h-1 rounded-[2px] bg-[#AA812A]" />
            <Text
              numberOfLines={1}
              className="font-semibold text-[8px] tracking-[1.25px] text-[#590B1D]"
            >
              VERIFIED
            </Text>
            <View className="w-1 h-1 rounded-[2px] bg-[#AA812A]" />
            <Text
              numberOfLines={1}
              className="font-semibold text-[8px] tracking-[1.25px] text-[#590B1D]"
            >
              PRIVATE
            </Text>
            <View className="w-1 h-1 rounded-[2px] bg-[#AA812A]" />
            <Text
              numberOfLines={1}
              className="font-semibold text-[8px] tracking-[1.25px] text-[#590B1D]"
            >
              INTENTIONAL
            </Text>
          </View>
        </View>

        <View className="absolute bottom-[105px] w-[172px] h-1 rounded overflow-hidden bg-[#E4CD98]">
          <Animated.View
            className="w-full h-full rounded bg-[#720F25]"
            style={{
              transform: [{ scaleX: progress }],
              transformOrigin: "left",
            }}
          />
        </View>
        <Text className="font-bold text-[10px] tracking-[2px] text-[#610C20] absolute bottom-[94px]">
          OPENING MILAAN
        </Text>
      </View>
    </AppCanvas>
  );
}

/* =========================================================
   WELCOME SCREEN
   ========================================================= */

export function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <AppCanvas>
      <SafeAreaView style={shared.safe}>
        <View className="pt-2 flex-row items-center">
          <Brand small />
          <View className="ml-auto flex-row items-center gap-1.5 px-2.5 py-[7px] rounded-[20px] bg-white/[.55] border border-[rgba(138,27,53,.28)]">
            <View className="w-1.5 h-1.5 rounded-[3px] bg-[#6E0E24]" />
            <Text className="font-semibold text-[9px] text-[#590B1D]">
              For something real
            </Text>
          </View>
        </View>

        <View className="h-[285px] justify-center">
          <View
            className="absolute left-[78px] top-[45px]"
            style={{ transform: [{ rotate: "-15deg" }] }}
          >
            <Text
              style={{
                fontSize: 25,
                color: "#A6324D",
                textShadowColor: "rgba(138,27,53,.28)",
                textShadowRadius: 8,
              }}
            >
              ♥
            </Text>
          </View>
          <PremiumSparkle />
          <View
            className="absolute w-[142px] h-[190px] rounded-[70px] overflow-hidden border-2 border-[rgba(218,152,167,.70)] left-[25px]"
            style={{
              transform: [{ rotate: "-8deg" }],
              shadowColor: "#8A1B35",
              shadowOpacity: 0.28,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 0 },
            }}
          >
            <Image
              source={{ uri: matches[1]!.photo }}
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
            />
          </View>
          <View
            className="absolute w-[142px] h-[190px] rounded-[70px] overflow-hidden border-2 border-[rgba(218,152,167,.70)] right-[25px] top-[55px]"
            style={{
              transform: [{ rotate: "8deg" }],
              shadowColor: "#8A1B35",
              shadowOpacity: 0.28,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 0 },
            }}
          >
            <Image
              source={{ uri: matches[0]!.photo }}
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
            />
          </View>
          <View
            className="absolute self-center items-center justify-center"
            style={{
              width: 76,
              height: 76,
              backgroundColor: "transparent",
              shadowColor: "transparent",
              shadowOpacity: 0,
              shadowRadius: 0,
              shadowOffset: { width: 0, height: 0 },
              elevation: 0,
            }}
          >
            <Image
              source={heartImage}
              resizeMode="contain"
              fadeDuration={0}
              style={{ width: 72, height: 72, backgroundColor: "transparent" }}
            />
          </View>
          <View className="absolute left-1 bottom-[38px] flex-row items-center gap-1.5 px-2.5 py-[7px] rounded-[20px] bg-[rgba(20,16,17,.94)] border border-[rgba(204,112,133,.55)]">
            <GlowIcon icon="heart" color="#FFFFFF" glow="#8A1B35" size={24} />
            <Text className="font-semibold text-[9px] text-white">
              Family first
            </Text>
          </View>
        </View>

        <View className="gap-3.5">
          <View>
            <View className="flex-row items-center mb-2">
              <Text
                className="font-bold text-[13px] tracking-[2.5px]"
                style={{ color: "#7D5C1F" }}
              >
                SERIOUS STARTS HERE
              </Text>
              <View
                style={{
                  width: 85,
                  height: 2,
                  marginLeft: 12,
                  backgroundColor: "#6C0E23",
                }}
              />
            </View>
            <Text
              className="font-bold text-[38px] leading-[43px]"
              style={{ color: "#130F10" }}
            >
              Meet <Text style={{ color: "#141011" }}>someone</Text>{" "}
              <Text style={{ color: "#161113" }}>who</Text>{" "}
              <Text style={{ color: "#181314" }}>means</Text>{" "}
              <Text style={{ color: "#181314" }}>it.</Text>
            </Text>
            <Text
              className="font-sans text-[15px] leading-[22px] mt-2"
              style={{ color: "#372E31" }}
            >
              Intentional, serious dating made for India.
            </Text>
          </View>

          <View className="flex-row gap-[7px]">
            <TrustPoint
              icon="shield-checkmark"
              label="Verified"
              description="Real people. Real profiles."
              iconColor="#CCA64F"
              glowColor="#8A1B35"
            />
            <TrustPoint
              icon="heart"
              label="Intentional"
              description="Connections that matter."
              iconColor="#FFFFFF"
              glowColor="#8A1B35"
            />
            <TrustPoint
              icon="lock-closed"
              label="Private"
              description="Your journey. Your space."
              iconColor="#FFFFFF"
              glowColor="#8A1B35"
            />
          </View>

          <View className="gap-2.5 mt-1">
            <Pressable onPress={onNext} style={{ borderRadius: 32 }}>
              <LinearGradient
                colors={["#151112", "#5C0C1E", "#161113", "#130F10"]}
                locations={[0, 0.45, 0.72, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 58,
                  borderRadius: 32,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  borderWidth: 1.5,
                  borderColor: "rgba(200,103,125,.62)",
                  shadowColor: "#8A1B35",
                  shadowOpacity: 0.58,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 9 },
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: "#E2D9CB",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "transparent",
                    shadowColor: "#C45F76",
                    shadowOpacity: 0.65,
                    shadowRadius: 8,
                  }}
                >
                  <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                </View>
                <Text className="font-bold text-[16px] text-white">
                  Start with intention
                </Text>
              </LinearGradient>
            </Pressable>
            <Button
              variant="ghost"
              label="I already have an account"
              onPress={onNext}
            />
          </View>
        </View>
      </SafeAreaView>
    </AppCanvas>
  );
}

/* =========================================================
   TRUST POINT (FIXED)
   ========================================================= */

function TrustPoint({
  icon,
  label,
  description,
  iconColor,
  glowColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  iconColor: string;
  glowColor: string;
}) {
  return (
    <View
      className="flex-1 rounded-[18px] bg-white/[.46] border border-[rgba(255,255,255,.70)] px-2.5 py-2.5"
      style={{
        shadowColor: "#6D0E24",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      }}
    >
      <View className="flex-row items-center gap-2 flex-nowrap">
        {/* 🚀 SIZE CHANGED: 42 → 32 (mobile par fit hoga) */}
        <GlowIcon icon={icon} color={iconColor} glow={glowColor} size={32} />

        <View className="flex-1">
          {/* 🚀 FIXED: numberOfLines={1} se label kabhi nahi tootega */}
          <Text
            numberOfLines={1}
            className="font-bold text-[10px] text-[#130F10]"
          >
            {label}
          </Text>
          <Text className="font-sans text-[7.5px] leading-[11px] text-[#6D0E24] mt-[2px]">
            {description}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   GLOW ICON
   ========================================================= */

function GlowIcon({
  icon,
  color,
  glow,
  size,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  glow: string;
  size: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(19,15,16,.90)",
        borderWidth: 1.5,
        borderColor: "rgba(218,152,167,.72)",
        shadowColor: glow,
        shadowOpacity: 0.72,
        shadowRadius: 13,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <LinearGradient
        colors={[
          "rgba(255,255,255,.22)",
          "rgba(138,27,53,.30)",
          "rgba(23,18,19,.30)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: size / 2,
        }}
      />
      <Ionicons name={icon} size={size * 0.48} color={color} />
    </View>
  );
}

/* =========================================================
   SPARKLE
   ========================================================= */

function PremiumSparkle() {
  return (
    <View
      className="absolute right-[26px] top-6 items-center justify-center"
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "rgba(20,16,17,.92)",
        borderWidth: 1.5,
        borderColor: "rgba(216,147,163,.80)",
        shadowColor: "#8A1B35",
        shadowOpacity: 0.7,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <Ionicons name="sparkles" size={19} color="#FFFFFF" />
    </View>
  );
}
