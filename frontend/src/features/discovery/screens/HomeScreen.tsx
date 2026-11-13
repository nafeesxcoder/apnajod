import { useEffect, useRef, useState } from "react";
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
import { PostsFeed } from "../../posts/PostsFeed";
import { ActivityModal } from "../../posts/ActivityModal";
import { postApi } from "../../../api/postApi";
import type { Match } from "../../../data";
import type { ProfileGrowthInput } from "../../../domain/growth";
import type { DiscoverySignal, MatchFilters } from "../../../storage";
import type { Screen } from "../../../app/navigation/types";
import { colors, palette, fonts, radius, typeScale } from "../../../theme";
import { IntentPassportCard } from "../components/IntentPassportCard";
import { AppCanvas } from "../../../components/AppCanvas";
import { TrustBadge } from "../../../components/TrustBadge";

import { DailyQuestionCard } from "../components/DailyQuestionCard";
import { DailyPicksRow } from "../components/DailyPicksRow";
import { brand, cardShadow, whiteCard } from "../../../components/brand";
import { GlowPulse, HeartBeat, PressScale, Reveal } from "../../../components/motion";
import { ProfileStrengthCard } from "../../profile/components/ProfileStrengthCard";
import { InviteCard } from "../../profile/components/InviteCard";
import type { profileStrength } from "../../../domain/profileStrength";

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
  onInterested,
  onSkip,
  onSparkRewarded,
  strength,
  completionRewardClaimed = false,
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
  /** A Spark was just earned (daily question) - refresh the count. */
  onSparkRewarded?: () => void;
  /** Profile strength - shown on Home only (not on Profile). */
  strength?: ReturnType<typeof profileStrength>;
  /** The one-time Super Like for a 100% profile has been paid. */
  completionRewardClaimed?: boolean;
  navigate: (s: Screen) => void;
}) {
  const navInset = useNavInset();
  // The posts feed at the bottom: a page more each time Home is scrolled near
  // its end, and back to the newest on pull-to-refresh.
  const [feedMore, setFeedMore] = useState(0);
  const [feedReload, setFeedReload] = useState(0);
  const feedAskedAt = useRef(0);
  // Activity (likes and comments on your posts): the heart in the header,
  // with a dot while something is new. Checked on open and every minute.
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityUnread, setActivityUnread] = useState(0);
  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    const check = () =>
      postApi
        .activityUnread(accessToken)
        .then((n) => live && setActivityUnread(n))
        .catch(() => undefined);
    void check();
    const timer = setInterval(check, 60_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [accessToken, activityOpen]);
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
          onScroll={(event) => {
            handleBottomNavScroll(event);
            // Near the end of Home: load the next page of posts.
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 900) {
              const now = Date.now();
              if (now - feedAskedAt.current > 1500) {
                feedAskedAt.current = now;
                setFeedMore((n) => n + 1);
              }
            }
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                setFeedReload((n) => n + 1);
                onRetryMatches();
              }}
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
                  // A new post shows at the top of the feed straight away.
                  onPosted={() => setFeedReload((n) => n + 1)}
                  size={34}
                  iconSize={22}
                  color={colors.text}
                  background="transparent"
                />
              </View>

              {!!accessToken && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    activityUnread > 0
                      ? `Activity, ${activityUnread} new`
                      : "Activity: likes and comments on your posts"
                  }
                  onPress={() => {
                    setActivityUnread(0);
                    setActivityOpen(true);
                  }}
                  hitSlop={8}
                  style={{ marginRight: 14 }}
                >
                  <Ionicons name="heart-outline" size={26} color={colors.text} />
                  {activityUnread > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        right: -1,
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: palette.crimson,
                        borderWidth: 2,
                        borderColor: colors.canvas,
                      }}
                    />
                  )}
                </Pressable>
              )}

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
                  backgroundColor: brand.pillBg,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 14,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={palette.crimson} />
                ) : (
                  <HeartBeat>
                    <Ionicons name="heart" size={22} color={palette.crimson} />
                  </HeartBeat>
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

            {/* Cards arrive one after another (components/motion.tsx). */}
            {!preview && (
              <Reveal delay={60}>
                <DailyQuestionCard
                  accessToken={accessToken}
                  onRewarded={onSparkRewarded}
                />
              </Reveal>
            )}

            {strength && (
              <Reveal delay={120}>
                <ProfileStrengthCard
                  {...strength}
                  onGo={(screen) => navigate(screen as Screen)}
                  rewardClaimed={completionRewardClaimed}
                />
              </Reveal>
            )}

            {!preview && (
              <Reveal delay={180}>
                <DailyPicksRow accessToken={accessToken} onOpen={openDetail} />
              </Reveal>
            )}

            {/* Intent passport — flatten happens in IntentPassportCard.tsx */}
            <Reveal delay={240}>
              <IntentPassportCard
                input={passportInput}
                compact
                onEdit={() => navigate("alignment")}
              />
            </Reveal>

            {!preview && (
              <Reveal delay={300}>
                <InviteCard accessToken={accessToken} />
              </Reveal>
            )}

            {crossedPaths && (
              <Pressable
                onPress={() => navigate("discovery")}
                style={{
                  ...whiteCard,
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  marginBottom: 16,
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

            {/* Top match — the photo card, with Pass and a beating Like */}
            {featured && (
              <Reveal delay={360} style={{ marginBottom: 28 }}>
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${featured.name}'s profile`}
                  onPress={() => openDetail(featured)}
                  scaleTo={0.985}
                  style={{
                    borderRadius: 22,
                    overflow: "hidden",
                    backgroundColor: palette.paperSand,
                    ...cardShadow,
                  }}
                >
                  <Image
                    source={{ uri: featured.photo }}
                    style={{
                      width: "100%",
                      height: isDesktopHome ? 520 : 460,
                    }}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={["rgba(10,20,32,0)", "rgba(10,20,32,0.85)"]}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      paddingTop: 90,
                      paddingHorizontal: 20,
                      paddingBottom: 20,
                      flexDirection: "row",
                      alignItems: "flex-end",
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text
                          style={{
                            fontFamily: fonts.display,
                            fontSize: typeScale.display - 4,
                            color: "#FFF",
                            flexShrink: 1,
                          }}
                        >
                          {featured.name}, {featured.age}
                        </Text>
                        {featured.verified && <TrustBadge blueTick={featured.blueTick} size={22} />}
                      </View>
                      <Text
                        style={{
                          fontFamily: fonts.body,
                          fontSize: typeScale.label,
                          color: "#E7EDF3",
                          marginTop: 4,
                        }}
                      >
                        {[featured.profession, featured.city].filter(Boolean).join(" · ")}
                      </Text>
                      <Text
                        style={{
                          fontFamily: fonts.bodySemi,
                          fontSize: 12,
                          color: "#FFFFFF",
                          marginTop: 8,
                          opacity: 0.9,
                        }}
                      >
                        Tap to view profile ›
                      </Text>
                    </View>
                    {onSkip && (
                      <PressScale
                        accessibilityRole="button"
                        accessibilityLabel={`Pass on ${featured.name}`}
                        onPress={() => onSkip(featured)}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 26,
                          backgroundColor: "#FFFFFF",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="close" size={24} color={palette.ink} />
                      </PressScale>
                    )}
                    {onInterested && (
                      <PressScale
                        accessibilityRole="button"
                        accessibilityLabel={`Interested in ${featured.name}`}
                        onPress={() => onInterested(featured)}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 26,
                          backgroundColor: palette.crimson,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <GlowPulse color={palette.crimson} radius={26} />
                        <HeartBeat>
                          <Ionicons name="heart" size={24} color="#FFFFFF" />
                        </HeartBeat>
                      </PressScale>
                    )}
                  </LinearGradient>
                </PressScale>
              </Reveal>
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
                    <PressScale
                      key={match.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${match.name}'s profile`}
                      onPress={() => openDetail(match)}
                      containerStyle={{ width: "48%", marginBottom: 18 }}
                      style={{
                        borderRadius: 18,
                        overflow: "hidden",
                        backgroundColor: palette.paperSand,
                        ...cardShadow,
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
                            {match.verified && <TrustBadge blueTick={match.blueTick} size={16} />}
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
                    </PressScale>
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

          {/* Posts from public accounts and your matches, like Instagram. */}
          <PostsFeed accessToken={accessToken} loadMoreSignal={feedMore} reloadKey={feedReload} />
        </ScrollView>

        <BottomNav active="home" navigate={navigate} />
        {!!accessToken && (
          <ActivityModal visible={activityOpen} accessToken={accessToken} onClose={() => setActivityOpen(false)} />
        )}
      </SafeAreaView>
    </AppCanvas>
  );
}
