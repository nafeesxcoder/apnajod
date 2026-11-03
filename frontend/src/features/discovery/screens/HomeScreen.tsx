import {
  Image,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, shared } from "../../../components";
import {
  BottomNav,
  handleBottomNavScroll,
} from "../../../components/navigation/BottomNav";
import type { Match } from "../../../data";
import { matchReasons } from "../../../domain/matching";
import type { ProfileGrowthInput } from "../../../domain/growth";
import type { DiscoverySignal, MatchFilters } from "../../../storage";
import type { Screen } from "../../../app/navigation/types";
import { colors } from "../../../theme";
import { homeCleanStyles, styles } from "../../../theme/appStyles";
import { IntentPassportCard } from "../components/IntentPassportCard";
import { MatchCard } from "../components/MatchCard";
import { AppCanvas } from "../../../components/AppCanvas";

function GlowIcon({
  icon,
  size = 36,
  color = "#FFFFFF",
  glowColor = "#8A1B35",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  glowColor?: string;
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
        shadowColor: glowColor,
        shadowOpacity: 0.72,
        shadowRadius: 13,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
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

type RoseAvailability = { freeAvailable: boolean; paidCredits: number };
type MemberMatchLoadState = "preview" | "loading" | "ready" | "error";
type MatchingPoolStatusView = { status: string; suggestions: string[] };

export function HomeScreen({
  preview,
  items,
  matchLoadState,
  matchingPoolStatus,
  onRetryMatches,
  preferences,
  alignment,
  firstName = "there",
  crossedPaths,
  openDetail,
  onInterested,
  onSkip,
  onRose,
  navigate,
}: {
  preview: boolean;
  items: Match[];
  matchLoadState: MemberMatchLoadState;
  matchingPoolStatus: MatchingPoolStatusView | null;
  onRetryMatches: () => void;
  preferences: { intent: string; vibes: string[]; filters: MatchFilters };
  alignment: Record<string, string>;
  signals: DiscoverySignal[];
  dismissedCount: number;
  profileGrowth: ProfileGrowthInput;
  firstName?: string;
  roseAvailability: RoseAvailability;
  crossedPaths: boolean;
  openDetail: (m: Match) => void;
  onInterested: (m: Match) => void;
  onSkip: (m: Match) => void;
  onRose: (m: Match) => void;
  navigate: (s: Screen) => void;
}) {
  const { width } = useWindowDimensions();
  const compactHome = width < 430;
  const swipeDeck = items.slice(0, 10);
  const featured = swipeDeck[0];
  const passportInput = {
    intent: preferences.intent,
    alignment: preview
      ? {
          timeline: "Within 1–2 years",
          children: "Open to children",
          family: "Balanced family involvement",
          relocation: "Open for the right person",
        }
      : alignment,
  };
  const poolNeedsVerification =
    matchingPoolStatus?.status === "verification_required";
  const poolNeedsPreferences =
    matchingPoolStatus?.status === "preferences_incomplete";
  const poolMessage =
    matchingPoolStatus?.suggestions[0] ??
    "No verified profiles meet your preferences right now. We will refresh your introductions as the community grows.";

  const profilePreviewPhoto = swipeDeck.find(
    (match) => match.name === "Arjun",
  )?.photo;

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        {/* Top Header - Mobile Style */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 20,
            paddingBottom: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 22, fontWeight: "700", color: colors.text }}
            >
              Good evening, {firstName} 👋
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
              Thoughtful connections. Meaningful futures.
            </Text>
          </View>
          <Pressable
            onPress={() => navigate("likes")}
            style={{ marginRight: 12, position: "relative" }}
          >
            <Ionicons
              name="notifications-outline"
              size={28}
              color={colors.text}
            />
            <View
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                backgroundColor: "#8A1B35",
                borderRadius: 10,
                width: 16,
                height: 16,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "white", fontSize: 10, fontWeight: "bold" }}
              >
                3
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => navigate("profile")}>
            {profilePreviewPhoto ? (
              <Image
                source={{ uri: profilePreviewPhoto }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: "#8A6722",
                }}
              />
            ) : (
              <Ionicons name="person-circle" size={40} color={colors.text} />
            )}
          </Pressable>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          onScroll={handleBottomNavScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Card */}
          <LinearGradient
            colors={["#FFFFFF", "#FDFAF4", "#F8F3E9"]}
            style={{
              borderRadius: 24,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#E2D9CB",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  borderWidth: 2,
                  borderColor: "#8A1B35",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 16,
                }}
              >
                <Text
                  style={{ fontSize: 24, fontWeight: "700", color: "#8A1B35" }}
                >
                  {swipeDeck.length}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#8A1B35",
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}
                >
                  INTRODUCTIONS
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  Chosen around your future.
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
              {swipeDeck.length} thoughtful introductions. Clear intent before
              chemistry, with room for a real conversation.
            </Text>
          </LinearGradient>

          {/* Intent Passport */}
          <IntentPassportCard
            input={passportInput}
            compact
            onEdit={() => navigate("alignment")}
          />

          {crossedPaths && (
            <Pressable
              onPress={() => navigate("discovery")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FDFAF4",
                padding: 16,
                borderRadius: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: "#E2D9CB",
              }}
            >
              <Ionicons
                name="location"
                size={24}
                color="#AA812A"
                style={{ marginRight: 12 }}
              />
              <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>
                Crossed paths is on — nearby profiles are included privately.
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#AA812A" />
            </Pressable>
          )}

          {/* Featured Match */}
          {featured && (
            <View style={{ marginBottom: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#8A1B35",
                    letterSpacing: 1,
                  }}
                >
                  YOUR TOP MATCH
                </Text>
                <Pressable onPress={() => openDetail(featured)}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#8A6722",
                      fontWeight: "600",
                    }}
                  >
                    View full story →
                  </Text>
                </Pressable>
              </View>
              <MatchCard
                featuredHome
                match={featured}
                reasons={
                  featured.reasons ?? matchReasons(featured, preferences)
                }
                onPress={() => openDetail(featured)}
                onInterested={() => onInterested(featured)}
                onSkip={() => onSkip(featured)}
                onRose={() => onRose(featured)}
              />
            </View>
          )}

          {/* Empty State */}
          {!items.length && (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 24,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#E2D9CB",
                marginBottom: 20,
              }}
            >
              <Ionicons
                name={
                  matchLoadState === "error"
                    ? "cloud-offline-outline"
                    : matchLoadState === "loading"
                      ? "hourglass-outline"
                      : "heart-outline"
                }
                size={48}
                color="#8A6722"
                style={{ marginBottom: 16 }}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.text,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {matchLoadState === "error"
                  ? "Could not load your matches"
                  : matchLoadState === "loading"
                    ? "Curating your matches…"
                    : matchLoadState === "preview"
                      ? "No profiles match these filters"
                      : "Your next introduction is being curated"}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                {matchLoadState === "error"
                  ? "We will never replace unavailable member data with demo profiles. Check your connection and try again."
                  : matchLoadState === "loading"
                    ? "Verified profiles are loading securely."
                    : matchLoadState === "preview"
                      ? "Try widening age, city, vibe or family filters."
                      : poolMessage}
              </Text>
              {matchLoadState === "error" ? (
                <Button
                  label="Try again"
                  icon="refresh"
                  onPress={onRetryMatches}
                />
              ) : matchLoadState === "preview" ? (
                <Button
                  label="Adjust filters"
                  onPress={() => navigate("discovery")}
                />
              ) : poolNeedsVerification ? (
                <Button
                  label="Complete verification"
                  icon="shield-checkmark-outline"
                  onPress={() => navigate("verifyHub")}
                />
              ) : poolNeedsPreferences ? (
                <Button
                  label="Complete preferences"
                  icon="options-outline"
                  onPress={() => navigate("discovery")}
                />
              ) : matchLoadState === "ready" ? (
                <Button
                  label="Review preferences"
                  icon="options-outline"
                  onPress={() => navigate("discovery")}
                />
              ) : null}
            </View>
          )}

          {/* Trust Strip */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            {[
              {
                title: "Verified & Safe",
                body: "Real people. Real intentions.",
                icon: "shield-checkmark" as const,
              },
              {
                title: "Curated Daily",
                body: "Quality over quantity.",
                icon: "sparkles" as const,
              },
              {
                title: "Privacy First",
                body: "You are in control.",
                icon: "lock-closed" as const,
              },
              {
                title: "Made for Serious",
                body: "Connections with purpose.",
                icon: "heart" as const,
              },
            ].map((item) => (
              <View
                key={item.title}
                style={{
                  width: "48%",
                  backgroundColor: "#FFFFFF",
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: "#E2D9CB",
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color="#8A6722"
                  style={{ marginBottom: 8 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.text,
                    marginBottom: 4,
                  }}
                >
                  {item.title}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  {item.body}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Navbar */}
        <BottomNav active="home" navigate={navigate} />
      </SafeAreaView>
    </AppCanvas>
  );
}
