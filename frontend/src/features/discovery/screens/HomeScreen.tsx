import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { Button } from "../../../components";
import {
  BottomNav,
  handleBottomNavScroll, useNavInset } from "../../../components/navigation/BottomNav";
import { AddPostButton } from "../../profile/components/AddPostButton";
import type { Match } from "../../../data";
import type { ProfileGrowthInput } from "../../../domain/growth";
import type { DiscoverySignal, MatchFilters } from "../../../storage";
import type { Screen } from "../../../app/navigation/types";
import { colors } from "../../../theme";
import { IntentPassportCard } from "../components/IntentPassportCard";
import { AppCanvas } from "../../../components/AppCanvas";

type RoseAvailability = { freeAvailable: boolean; paidCredits: number };
type MemberMatchLoadState = "preview" | "loading" | "ready" | "error";
type MatchingPoolStatusView = { status: string; suggestions: string[] };

const GOLD = "#8A2237";
const RUBY = "#1F5286";
const LINE = "#D3D6DA";
const PAPER = "#F8F8F9";
const MAX_WIDTH = 720;

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen({
  preview,
  items,
  matchLoadState,
  matchingPoolStatus,
  onRetryMatches,
  preferences,
  alignment,
  firstName = "",
  profilePhoto,
  notificationCount = 0,
  accessToken,
  crossedPaths,
  openDetail,
  navigate,
}: {
  preview: boolean;
  items: Match[];
  matchLoadState: MemberMatchLoadState;
  matchingPoolStatus: MatchingPoolStatusView | null;
  onRetryMatches: () => void;
  preferences: { intent: string; vibes: string[]; filters: MatchFilters };
  alignment: Record<string, string>;
  signals?: DiscoverySignal[];
  dismissedCount?: number;
  profileGrowth?: ProfileGrowthInput;
  firstName?: string;
  profilePhoto?: string;
  notificationCount?: number;
  accessToken?: string;
  roseAvailability?: RoseAvailability;
  crossedPaths: boolean;
  openDetail: (m: Match) => void;
  onInterested?: (m: Match) => void;
  onSkip?: (m: Match) => void;
  onRose?: (m: Match) => void;
  navigate: (s: Screen) => void;
}) {
  const navInset = useNavInset();
  const swipeDeck = items.slice(0, 10);
  const featured = swipeDeck[0];
  const others = swipeDeck.slice(1);
  const name = firstName.trim();
  const initial = name ? name.charAt(0).toUpperCase() : "";

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

  const loading = matchLoadState === "loading";

  const summaryTitle = loading
    ? "Finding your introductions"
    : swipeDeck.length === 0
      ? "No introductions yet"
      : swipeDeck.length === 1
        ? "1 introduction for you"
        : `${swipeDeck.length} introductions for you`;
  const summaryBody = loading
    ? "Verified profiles are loading securely."
    : swipeDeck.length === 0
      ? "Check back soon. We refresh your list as new members join."
      : "Each one is chosen for what you want from a relationship, so you can start with a real conversation.";

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas, paddingLeft: navInset.paddingLeft }}>
        <ScrollView
          onScroll={handleBottomNavScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRetryMatches}
              tintColor={GOLD}
            />
          }
        >
          <View
            style={{
              width: "100%",
              maxWidth: MAX_WIDTH,
              alignSelf: "center",
              paddingHorizontal: 20,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingTop: 20,
                paddingBottom: 16,
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.muted,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  {greetingForNow()}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 26,
                    fontWeight: "700",
                    color: colors.text,
                    marginTop: 1,
                  }}
                >
                  {name || "Welcome"}
                </Text>
                {items.length > 0 && (
                  <Text
                    style={{ fontSize: 12, color: GOLD, marginTop: 3, fontWeight: "600" }}
                  >
                    {items.length} {items.length === 1 ? "person" : "people"} to see
                  </Text>
                )}
              </View>

              <View style={{ marginRight: 12 }}>
                <AddPostButton
                  accessToken={accessToken}
                  size={34}
                  iconSize={22}
                  color={colors.text}
                  background="transparent"
                />
              </View>

              <Pressable
                onPress={() => navigate("likes")}
                hitSlop={8}
                style={{ marginRight: 14 }}
              >
                <Ionicons
                  name="notifications-outline"
                  size={26}
                  color={colors.text}
                />
                {notificationCount > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      minWidth: 18,
                      height: 18,
                      paddingHorizontal: 4,
                      borderRadius: 9,
                      backgroundColor: RUBY,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable onPress={() => navigate("profile")} hitSlop={8}>
                {profilePhoto ? (
                  <Image
                    source={{ uri: profilePhoto }}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      borderWidth: 2,
                      borderColor: GOLD,
                      backgroundColor: LINE,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      borderWidth: 2,
                      borderColor: GOLD,
                      backgroundColor: PAPER,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {initial ? (
                      <Text
                        style={{ fontSize: 17, fontWeight: "700", color: GOLD }}
                      >
                        {initial}
                      </Text>
                    ) : (
                      <Ionicons name="person" size={20} color={GOLD} />
                    )}
                  </View>
                )}
              </Pressable>
            </View>

            {/* Summary */}
            <View
              style={{
                backgroundColor: PAPER,
                borderRadius: 20,
                padding: 18,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: LINE,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#EBEDEF",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 14,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={RUBY} />
                ) : (
                  <Ionicons name="heart" size={22} color={RUBY} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {summaryTitle}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.muted,
                    lineHeight: 19,
                    marginTop: 3,
                  }}
                >
                  {summaryBody}
                </Text>
              </View>
            </View>

            {/* Intent passport */}
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
                  backgroundColor: PAPER,
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: LINE,
                }}
              >
                <Ionicons
                  name="location"
                  size={22}
                  color="#AA2A44"
                  style={{ marginRight: 12 }}
                />
                <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>
                  Crossed paths is on. Nearby profiles are included privately.
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#AA2A44" />
              </Pressable>
            )}

            {/* Top match - Simple Card with View Profile */}
            {featured && (
              <View style={{ marginBottom: 24 }}>
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
                      fontSize: 17,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    Your top match
                  </Text>
                </View>
                <Pressable
                  onPress={() => openDetail(featured)}
                  style={{
                    borderRadius: 20,
                    overflow: "hidden",
                    backgroundColor: "#FFF",
                    borderWidth: 1,
                    borderColor: LINE,
                  }}
                >
                  <View style={{ position: "relative" }}>
                    <Image
                      source={{ uri: featured.photo }}
                      style={{ width: "100%", height: 380 }}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.85)"]}
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 160,
                        justifyContent: "flex-end",
                        padding: 20,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 26,
                          fontWeight: "700",
                          color: "#FFF",
                        }}
                      >
                        {featured.name}, {featured.age}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#DFE4EA",
                          marginTop: 4,
                        }}
                      >
                        {featured.profession} · {featured.city}
                      </Text>
                    </LinearGradient>
                  </View>
                  <View style={{ padding: 16 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: RUBY,
                        paddingVertical: 14,
                        borderRadius: 12,
                      }}
                    >
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color="#FFF"
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={{
                          color: "#FFF",
                          fontWeight: "600",
                          fontSize: 15,
                        }}
                      >
                        View Profile
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            )}

            {/* More introductions - Grid with View Profile */}
            {others.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "700",
                    color: colors.text,
                    marginBottom: 12,
                  }}
                >
                  More introductions
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                  }}
                >
                  {others.map((match) => (
                    <Pressable
                      key={match.id}
                      onPress={() => openDetail(match)}
                      style={{
                        width: "48%",
                        marginBottom: 16,
                        borderRadius: 16,
                        overflow: "hidden",
                        backgroundColor: "#FFF",
                        borderWidth: 1,
                        borderColor: LINE,
                      }}
                    >
                      <View style={{ position: "relative" }}>
                        <Image
                          source={{ uri: match.photo }}
                          style={{ width: "100%", height: 200 }}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(0,0,0,0.75)"]}
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: 80,
                            justifyContent: "flex-end",
                            padding: 10,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "700",
                              color: "#FFF",
                            }}
                          >
                            {match.name}, {match.age}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#DFE4EA",
                            }}
                          >
                            {match.city}
                          </Text>
                        </LinearGradient>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Empty state */}
            {!items.length && !loading && (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 24,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: LINE,
                  marginBottom: 20,
                }}
              >
                <Ionicons
                  name={
                    matchLoadState === "error"
                      ? "cloud-offline-outline"
                      : "heart-outline"
                  }
                  size={44}
                  color={GOLD}
                  style={{ marginBottom: 14 }}
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
                    : matchLoadState === "preview"
                      ? "No profiles match these filters"
                      : "Your next introduction is being curated"}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.muted,
                    textAlign: "center",
                    lineHeight: 20,
                    marginBottom: 16,
                  }}
                >
                  {matchLoadState === "error"
                    ? "Check your connection and try again. We never replace missing member data with demo profiles."
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
          </View>
        </ScrollView>

        <BottomNav active="home" navigate={navigate} />
      </SafeAreaView>
    </AppCanvas>
  );
}
