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
  handleBottomNavScroll,
  useNavInset,
} from "../../../components/navigation/BottomNav";
import { useLayout } from "../../../layout/useLayout";
import { AddPostButton } from "../../profile/components/AddPostButton";
import type { Match } from "../../../data";
import type { ProfileGrowthInput } from "../../../domain/growth";
import type { DiscoverySignal, MatchFilters } from "../../../storage";
import type { Screen } from "../../../app/navigation/types";
import { colors, palette, fonts, radius, typeScale } from "../../../theme";
import { IntentPassportCard } from "../components/IntentPassportCard";
import { AppCanvas } from "../../../components/AppCanvas";
import { VerifiedBadge } from "../../../components/VerifiedBadge";

type RoseAvailability = { freeAvailable: boolean; paidCredits: number };
type MemberMatchLoadState = "preview" | "loading" | "ready" | "error";
type MatchingPoolStatusView = { status: string; suggestions: string[] };

const MAX_WIDTH = 720;
const DESKTOP_MAX_WIDTH = 1000;

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
  const { isDesktop: isDesktopHome } = useLayout();
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
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: palette.paperBase,
          paddingLeft: navInset.paddingLeft,
        }}
      >
        <ScrollView
          onScroll={handleBottomNavScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRetryMatches}
              tintColor={palette.crimson}
            />
          }
        >
          <View
            style={{
              width: "100%",
              maxWidth: isDesktopHome ? DESKTOP_MAX_WIDTH : MAX_WIDTH,
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
                    fontFamily: fonts.body,
                    fontSize: typeScale.label,
                    color: colors.muted,
                  }}
                >
                  {greetingForNow()}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: fonts.display,
                    fontSize: typeScale.title,
                    color: colors.text,
                    marginTop: 2,
                  }}
                >
                  {name || "Welcome"}
                </Text>
                {items.length > 0 && (
                  <Text
                    style={{
                      fontFamily: fonts.bodySemi,
                      fontSize: typeScale.caption,
                      color: palette.crimson,
                      marginTop: 3,
                    }}
                  >
                    {items.length} {items.length === 1 ? "person" : "people"} to
                    see
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
                      borderRadius: radius.pill,
                      backgroundColor: palette.crimson,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontFamily: fonts.bodyBold,
                        fontSize: 10,
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
                      borderRadius: radius.pill,
                      borderWidth: 2,
                      borderColor: palette.crimson,
                      backgroundColor: palette.rule,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: radius.pill,
                      borderWidth: 2,
                      borderColor: palette.crimson,
                      backgroundColor: palette.paperSand,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {initial ? (
                      <Text
                        style={{
                          fontFamily: fonts.display,
                          fontSize: 17,
                          color: palette.crimson,
                        }}
                      >
                        {initial}
                      </Text>
                    ) : (
                      <Ionicons
                        name="person"
                        size={20}
                        color={palette.crimson}
                      />
                    )}
                  </View>
                )}
              </Pressable>
            </View>

            {/* Summary — unboxed */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingBottom: 16,
                marginBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: palette.rule,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.pill,
                  backgroundColor: palette.paperSand,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 14,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={palette.navy} />
                ) : (
                  <Ionicons name="heart" size={22} color={palette.navy} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: typeScale.section,
                    color: colors.text,
                  }}
                >
                  {summaryTitle}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: typeScale.label,
                    color: colors.muted,
                    lineHeight: 19,
                    marginTop: 3,
                  }}
                >
                  {summaryBody}
                </Text>
              </View>
            </View>

            {/* Intent passport — flatten happens in IntentPassportCard.tsx */}
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
                  backgroundColor: palette.paperSand,
                  padding: 16,
                  borderRadius: radius.md,
                  marginBottom: 20,
                }}
              >
                <Ionicons
                  name="location"
                  size={22}
                  color={palette.crimson}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: fonts.body,
                    fontSize: typeScale.label,
                    color: colors.text,
                  }}
                >
                  Crossed paths is on. Nearby profiles are included privately.
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={palette.crimson}
                />
              </Pressable>
            )}

            {/* Top match — hero */}
            {featured && (
              <View style={{ marginBottom: 32 }}>
                <Pressable
                  onPress={() => openDetail(featured)}
                  style={{
                    borderRadius: radius.xl,
                    overflow: "hidden",
                    backgroundColor: palette.paperSand,
                  }}
                >
                  <View style={{ position: "relative" }}>
                    <Image
                      source={{ uri: featured.photo }}
                      style={{
                        width: "100%",
                        height: isDesktopHome ? 520 : 460,
                      }}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.85)"]}
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 200,
                        justifyContent: "flex-end",
                        padding: 24,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: fonts.display,
                            fontSize: typeScale.display,
                            color: "#FFF",
                            flexShrink: 1,
                          }}
                        >
                          {featured.name}, {featured.age}
                        </Text>
                        {featured.verified && <VerifiedBadge size={24} />}
                      </View>
                      <Text
                        style={{
                          fontFamily: fonts.body,
                          fontSize: typeScale.label,
                          color: "#F4E9E0",
                          marginTop: 6,
                        }}
                      >
                        {featured.profession} · {featured.city}
                      </Text>
                    </LinearGradient>
                  </View>
                  <View style={{ padding: 20 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: palette.navy,
                        paddingVertical: 16,
                        borderRadius: radius.md,
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
                          fontFamily: fonts.bodySemi,
                          fontSize: typeScale.body,
                        }}
                      >
                        View profile
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            )}

            {/* More introductions */}
            {others.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: typeScale.section,
                    color: colors.text,
                    marginBottom: 14,
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
                        marginBottom: 18,
                        borderRadius: radius.lg,
                        overflow: "hidden",
                        backgroundColor: palette.paperSand,
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
                            height: 90,
                            justifyContent: "flex-end",
                            padding: 12,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Text
                              numberOfLines={1}
                              style={{
                                fontFamily: fonts.display,
                                fontSize: 17,
                                color: "#FFF",
                                flexShrink: 1,
                              }}
                            >
                              {match.name}, {match.age}
                            </Text>
                            {match.verified && <VerifiedBadge size={16} />}
                          </View>
                          <Text
                            style={{
                              fontFamily: fonts.body,
                              fontSize: typeScale.caption,
                              color: "#F4E9E0",
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

            {/* Empty state — unboxed */}
            {!items.length && !loading && (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: 32,
                  paddingHorizontal: 16,
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
                  color={palette.crimson}
                  style={{ marginBottom: 14 }}
                />
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: typeScale.section,
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
                    fontFamily: fonts.body,
                    fontSize: typeScale.body,
                    color: colors.muted,
                    textAlign: "center",
                    lineHeight: 20,
                    marginBottom: 18,
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
