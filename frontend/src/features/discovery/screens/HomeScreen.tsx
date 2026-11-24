import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../../components";

const brandLogo = require("../../../../assets/apnajoda-logo.png");
import {
  BottomNav,
  handleBottomNavScroll,
  useNavInset,
} from "../../../components/navigation/BottomNav";
import { useLayout } from "../../../layout/useLayout";
import { AddPostButton } from "../../profile/components/AddPostButton";
import { PostsFeed } from "../../posts/PostsFeed";
import { StoriesTray } from "../../stories/StoriesTray";
import { useFestival } from "../../festival/festivalStore";
import { FestivalBanner } from "../../festival/FestivalBanner";
import { FestivalParticles } from "../../festival/FestivalParticles";
import { openStoryChooser } from "../../stories/storyStore";
import { postApi } from "../../../api/postApi";
import { matchApi } from "../../../api/matchApi";
import type { Match } from "../../../data";
import type { ProfileGrowthInput } from "../../../domain/growth";
import type { DiscoverySignal } from "../../../storage";
import type { Screen } from "../../../app/navigation/types";
import { colors, palette, fonts, radius, typeScale } from "../../../theme";
import { AppCanvas } from "../../../components/AppCanvas";

import { DailyQuestionCard } from "../components/DailyQuestionCard";
import { DailyPicksRow } from "../components/DailyPicksRow";
import { BoostedRow } from "../components/BoostedRow";
import { whiteCard } from "../../../components/brand";
import { Reveal } from "../../../components/motion";
import { ProfileStrengthCard } from "../../profile/components/ProfileStrengthCard";
import { InviteCard } from "../../profile/components/InviteCard";
import type { profileStrength } from "../../../domain/profileStrength";

type RoseAvailability = { freeAvailable: boolean; paidCredits: number };
type MemberMatchLoadState = "preview" | "loading" | "ready" | "error";
type MatchingPoolStatusView = { status: string; suggestions: string[] };

const MAX_WIDTH = 720;
const DESKTOP_MAX_WIDTH = 1000;

export function HomeScreen({
  preview,
  items,
  matchLoadState,
  matchingPoolStatus,
  onRetryMatches,
  firstName = "",
  profilePhoto,
  accessToken,
  crossedPaths,
  openDetail,
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
  signals?: DiscoverySignal[];
  dismissedCount?: number;
  profileGrowth?: ProfileGrowthInput;
  firstName?: string;
  profilePhoto?: string;
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
  const feedScrollRef = useRef<ScrollView>(null);
  // Activity (likes, comments and mentions on your posts and stories) is the
  // Activity tab of Notifications; its count adds to the bell's. Checked on
  // open and every minute.
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
  }, [accessToken]);
  // The bell: likes, like-backs, Sparks and Super Likes since Notifications
  // was last opened. Opening it clears the number on the server.
  const [notificationCount, setNotificationCount] = useState(0);
  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    const check = () =>
      matchApi
        .notificationCount(accessToken)
        .then((n) => live && setNotificationCount(n))
        .catch(() => undefined);
    void check();
    const timer = setInterval(check, 60_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [accessToken]);

  // Scroll to top when feed reloads (pull-to-refresh or new post posted)
  useEffect(() => {
    if (feedReload > 0 && feedScrollRef.current) {
      feedScrollRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [feedReload]);

  // One bell for everything new: likes on you and activity on your posts.
  const bellCount = notificationCount + activityUnread;
  const { isDesktop: isDesktopHome } = useLayout();
  const name = firstName.trim();
  // A festival theme the admin has put on (Diwali, Eid...), or null.
  const festival = useFestival();
  const initial = name ? name.charAt(0).toUpperCase() : "";

  const poolNeedsVerification =
    matchingPoolStatus?.status === "verification_required";
  const poolNeedsPreferences =
    matchingPoolStatus?.status === "preferences_incomplete";
  const poolMessage =
    matchingPoolStatus?.suggestions[0] ??
    "No verified profiles meet your preferences right now. We will refresh your introductions as the community grows.";

  const loading = matchLoadState === "loading";

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
          ref={feedScrollRef}
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
              <View style={{ width: 44, alignItems: "flex-start", marginTop: -8 }}>
                <View>
                <AddPostButton
                  accessToken={accessToken}
                  // A new post shows at the top of the feed straight away.
                  onPosted={() => setFeedReload((n) => n + 1)}
                  withStory
                  size={42}
                  iconSize={30}
                  color={colors.text}
                  background="transparent"
                />
                </View>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Image
                  source={brandLogo}
                  style={{ width: 116, height: 32 }}
                  resizeMode="contain"
                  accessibilityLabel="Apnajoda"
                />
              </View>
              <View style={{ width: 44, alignItems: "flex-end", marginTop: -8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  bellCount > 0
                    ? `Notifications, ${bellCount} new`
                    : "Notifications: likes and activity"
                }
                onPress={() => {
                  setNotificationCount(0);
                  navigate("likes");
                }}
                hitSlop={8}
                style={{ marginRight: 0 }}
              >
                <Ionicons
                  name="notifications-outline"
                  size={32}
                  color={colors.text}
                />
                {bellCount > 0 && (
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
                      {bellCount > 9 ? "9+" : bellCount}
                    </Text>
                  </View>
                )}
              </Pressable>

              </View>
            </View>

            {/* The festival the admin has on: greeting and a festive story. */}
            {festival && (
              <FestivalBanner
                theme={festival}
                name={name}
                onStory={accessToken ? openStoryChooser : undefined}
              />
            )}

            {/* Stories (24 hours), like Instagram's row at the top. */}
            <StoriesTray
              accessToken={accessToken}
              myPhoto={profilePhoto}
              myInitial={initial}
              reloadKey={feedReload}
            />

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
              <Reveal delay={120}>
                <BoostedRow members={items.filter((m) => m.boosted).slice(0, 10)} onOpen={openDetail} />
              </Reveal>
            )}

            {!preview && (
              <Reveal delay={180}>
                <DailyPicksRow accessToken={accessToken} onOpen={openDetail} />
              </Reveal>
            )}

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

            {/* Empty state — unboxed */}
            {!items.length &&
              !loading &&
              (matchLoadState === "error" ||
                matchLoadState === "preview" ||
                poolNeedsVerification ||
                poolNeedsPreferences) && (
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
                      : poolNeedsVerification
                        ? "Verify your profile to see introductions"
                        : poolNeedsPreferences
                          ? "Finish your preferences to see introductions"
                          : "No introductions right now"}
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
                ) : null}
              </View>
            )}
          </View>

          {/* Posts from public accounts and your matches, like Instagram. */}
          <PostsFeed accessToken={accessToken} loadMoreSignal={feedMore} reloadKey={feedReload} />
        </ScrollView>

        <BottomNav active="home" navigate={navigate} />
        {festival && <FestivalParticles theme={festival} />}
      </SafeAreaView>
    </AppCanvas>
  );
}
