import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { socialApi, type PersonPage } from "../../../api/socialApi";
import { fonts, palette, radius, typeScale } from "../../../theme";
import { TrustBadge } from "../../../components/TrustBadge";
import { IntentSection } from "../../../components/IntentBadges";
import { GlowPulse, HeartBeat, PressScale, Reveal } from "../../../components/motion";
import { BottomNav, useNavInset } from "../../../components/navigation/BottomNav";
import { LinearGradient } from "expo-linear-gradient";
import { HobbyRow } from "../../../components/HobbyRow";
import { Linking } from "react-native";
import { useFamilyShare } from "../../../components/FamilyShareButton";
import { PostsSection } from "../../profile/components/PostsSection";
import { StoryRing } from "../../stories/StoryRing";
import { useStoryStatus } from "../../stories/storyStore";
import { GunBadge } from "../../kundli/KundliSheet";
import { kundliApi } from "../../../api/kundliApi";
import { ZoomPhoto } from "../../../components/ZoomPhoto";

const MAX_WIDTH = 720;
const brandLogo = require("../../../../assets/apnajoda-logo.png");
const SIDE_PADDING = 16;

/** The two buttons under the details, the same size as on your own Profile. */
const actionButton = {
  flex: 1,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  gap: 6,
  paddingVertical: 10,
  borderRadius: radius.pill,
  minHeight: 44,
};
const actionText = { fontFamily: fonts.bodySemi, fontSize: 13 };

export function PersonScreen({
  userId,
  navigate,
  navActive = "find",
  onLoad,
  onFollow,
  onMessage,
  onBlock,
  accessToken,
}: {
  /** For "show my family" - only offered once you are a match. */
  accessToken?: string;
  userId: string;
  /** For the bar at the bottom, as on your own Profile (there is no back button). */
  navigate: (screen: any) => void;
  /** The tab you came from (Search, Home, Chats), lit in the bar. */
  navActive?: string;
  onLoad: (userId: string) => Promise<PersonPage>;
  onFollow: (userId: string) => Promise<"accepted" | "pending">;
  onMessage: (page: PersonPage) => void;
  onBlock?: (userId: string) => void;
}) {
  const [page, setPage] = useState<PersonPage | null>(null);
  const storyStatus = useStoryStatus(userId);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    if (!accessToken) return;
    void socialApi
      .muted(accessToken)
      .then((list) => setMuted(list.some((person) => person.userId === userId)))
      .catch(() => undefined);
  }, [accessToken, userId]);
  const toggleMute = async () => {
    if (!accessToken) return;
    if (muted) await socialApi.unmute(accessToken, userId).catch(() => undefined);
    else await socialApi.mute(accessToken, userId).catch(() => undefined);
    setMuted(!muted);
  };
  const [busy, setBusy] = useState(false);
  // "Show my family" sits beside Message, as "Send to family" does on your own Profile.
  const family = useFamilyShare({
    accessToken,
    targetId: userId,
    name: page?.profile.firstName || page?.user.username || "them",
  });
  // Gun Milan with this person, when both have added a Rashi.
  const [gun, setGun] = useState<{ score: number; max: number; full: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    setGun(null);
    if (!accessToken) return;
    kundliApi
      .with(accessToken, userId)
      .then((k) => active && k.result && setGun({ score: k.result.total, max: k.result.max, full: k.result.full }))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [accessToken, userId]);

  useEffect(() => {
    let active = true;
    setPage(null);
    setError("");
    onLoad(userId)
      .then((p) => active && setPage(p))
      .catch(
        (e) =>
          active &&
          setError(
            e instanceof Error ? e.message : "Could not open this account.",
          ),
      );
    return () => {
      active = false;
    };
  }, [userId, onLoad]);

  const like = async () => {
    if (!page || busy) return;
    setBusy(true);
    setError("");
    try {
      await onFollow(userId);
      const fresh = await onLoad(userId).catch(() => null);
      if (fresh) setPage(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !page) {
    return (
      <Shell navigate={navigate} navActive={navActive}>
        <View
          style={{
            paddingVertical: 60,
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          <Ionicons
            name="alert-circle-outline"
            size={40}
            color={palette.slate}
          />
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: palette.slate,
              textAlign: "center",
              marginTop: 12,
            }}
          >
            {error}
          </Text>
        </View>
      </Shell>
    );
  }

  if (!page) {
    return (
      <Shell navigate={navigate} navActive={navActive}>
        <View style={{ paddingVertical: 60, alignItems: "center" }}>
          <ActivityIndicator color={palette.navy} />
        </View>
      </Shell>
    );
  }

  const { user, profile, state } = page;
  const likeStatus = page.like.status;
  const cover = profile.photos[0] || user.avatarUrl || "";
  const extraPhotos = profile.photos.slice(1);
  const postsLocked = !!page.posts?.locked;
  const avatar = cover ? (
    <ZoomPhoto uri={cover} label={`${user.name}'s photo`}>
      <Image
        source={{ uri: cover }}
        style={{ width: "100%", height: "100%", backgroundColor: palette.paperSand }}
        resizeMode="cover"
        accessibilityLabel={`${user.name}'s photo`}
      />
    </ZoomPhoto>
  ) : (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: palette.paperSand }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 46, color: palette.crimson }}>
        {(user.username || "?").slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );

  return (
    <Shell
      navigate={navigate}
      navActive={navActive}
      onBlock={onBlock ? () => onBlock(userId) : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 100,
          paddingHorizontal: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            width: "100%",
            maxWidth: MAX_WIDTH,
            alignSelf: "center",
            paddingHorizontal: SIDE_PADDING,
            // The photo starts just under the header, as on your own Profile.
            paddingBottom: 20,
          }}
        >
          {/* Laid out like your own Profile: the same photo ring, name,
              details, hobbies and a row of two buttons - Message and Show my
              family here, where yours has Edit profile and Send to family. */}
          <View style={{ alignItems: "center", marginTop: 4 }}>
            {/* A story up: the story ring replaces the gradient ring, and tapping plays it. */}
            <StoryRing userId={userId} size={116}>
              {storyStatus === "none" ? (
                <LinearGradient
                  colors={[palette.crimson, palette.navy]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={{ width: 116, height: 116, borderRadius: 58, padding: 3 }}
                >
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 55,
                      borderWidth: 3,
                      borderColor: palette.paper,
                      overflow: "hidden",
                      backgroundColor: palette.paper,
                    }}
                  >
                    {avatar}
                  </View>
                </LinearGradient>
              ) : (
                <View style={{ width: 116, height: 116, borderRadius: 58, overflow: "hidden" }}>{avatar}</View>
              )}
            </StoryRing>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 12,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 28,
                lineHeight: 34,
                color: palette.ink,
                textAlign: "center",
                flexShrink: 1,
              }}
            >
              {user.name}
              {profile.age ? `, ${profile.age}` : ""}
            </Text>
            {profile.verified && <TrustBadge blueTick={profile.blueTick} size={22} />}
          </View>

          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 13,
              color: palette.crimson,
              textAlign: "center",
              marginTop: 2,
            }}
          >
            @{user.username}
          </Text>

          {!!(profile.city || profile.profession) && (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                color: palette.slate,
                textAlign: "center",
                marginTop: 2,
              }}
            >
              {[profile.city, profile.profession].filter(Boolean).join("  ·  ")}
            </Text>
          )}

          {/* Where the two of you stand, and Gun Milan, side by side. */}
          {(likeStatus !== "none" || (!state.self && !!gun)) && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
              }}
            >
              {likeStatus !== "none" && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: radius.pill,
                    backgroundColor: likeStatus === "accepted" ? palette.marigoldTint : palette.paperSand,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemi,
                      fontSize: 12,
                      color: likeStatus === "accepted" ? palette.emerald : palette.navy,
                    }}
                  >
                    {likeStatus === "accepted"
                      ? "Matched"
                      : likeStatus === "likes_you"
                        ? "Likes you"
                        : "Pending — waiting for them"}
                  </Text>
                </View>
              )}
              {!state.self && !!gun && <GunBadge gun={gun} userId={userId} name={user.name} />}
            </View>
          )}

          {profile.hobbies.length > 0 && <HobbyRow hobbies={profile.hobbies} />}

          {!state.self && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
              {likeStatus === "accepted" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${user.username}`}
                  onPress={() => onMessage(page)}
                  style={[actionButton, { backgroundColor: palette.navy }]}
                >
                  <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
                  <Text style={[actionText, { color: "#FFFFFF" }]}>Message</Text>
                </Pressable>
              ) : likeStatus === "pending" ? (
                <View style={[actionButton, { backgroundColor: palette.paperSand }]}>
                  <Ionicons name="time-outline" size={16} color={palette.slate} />
                  <Text style={[actionText, { color: palette.slate }]}>Pending</Text>
                </View>
              ) : (
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel={
                    likeStatus === "likes_you"
                      ? `Accept ${user.username} and open a chat`
                      : `Like ${user.username}`
                  }
                  disabled={busy}
                  onPress={() => void like()}
                  containerStyle={{ flex: 1 }}
                  style={[actionButton, { backgroundColor: palette.crimson, opacity: busy ? 0.6 : 1 }]}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <GlowPulse color={palette.crimson} radius={radius.pill} spread={1.12} />
                      <HeartBeat>
                        <Ionicons name="heart" size={16} color="#FFFFFF" />
                      </HeartBeat>
                      <Text style={[actionText, { color: "#FFFFFF" }]}>
                        {likeStatus === "likes_you" ? "Accept" : "Like"}
                      </Text>
                    </>
                  )}
                </PressScale>
              )}

              {likeStatus !== "accepted" && page.canMessage && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${user.username}`}
                  onPress={() => onMessage(page)}
                  style={[actionButton, { backgroundColor: palette.navy }]}
                >
                  <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
                  <Text style={[actionText, { color: "#FFFFFF" }]}>Message</Text>
                </Pressable>
              )}

              {likeStatus === "accepted" && family.available && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share this profile"
                  disabled={family.busy}
                  onPress={() => void family.share()}
                  style={[actionButton, { backgroundColor: palette.paper, borderWidth: 1.5, borderColor: palette.navy }]}
                >
                  <Ionicons name="people" size={16} color={palette.navy} />
                  <Text style={[actionText, { color: palette.navy }]}>Share profile</Text>
                </Pressable>
              )}
            </View>
          )}

          {(!!profile.about || !!profile.link) && (
            <Reveal delay={60} style={{ marginTop: 24 }}>
              <View style={{ paddingHorizontal: 4, gap: 8 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: typeScale.section, color: palette.ink }}>About</Text>
                {!!profile.about && (
                  <Text style={{ fontFamily: fonts.body, fontSize: 15, color: palette.inkSoft, lineHeight: 22 }}>
                    {profile.about}
                  </Text>
                )}
                {!!profile.link && !!profile.linkTitle && (
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: palette.ink }}>{profile.linkTitle}</Text>
                )}
                {!!profile.link && (
                  <Text
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(String(profile.link))}
                    style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.navy }}
                  >
                    {String(profile.link).replace(/^https?:\/\//, "")}
                  </Text>
                )}
              </View>
            </Reveal>
          )}

          {!!profile.intent && (
            <Reveal delay={120}>
              <IntentSection input={profile.intent} />
            </Reveal>
          )}

          {extraPhotos.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: typeScale.section,
                  color: palette.ink,
                  marginBottom: 12,
                }}
              >
                Photos
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {extraPhotos.map((uri) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={{
                      width: "31.5%",
                      aspectRatio: 1,
                      borderRadius: radius.md,
                      backgroundColor: palette.paperSand,
                    }}
                    resizeMode="cover"
                  />
                ))}
              </View>
            </View>
          )}

          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: typeScale.section,
                color: palette.ink,
                marginBottom: 12,
              }}
            >
              Posts
              {postsLocked ? "  🔒" : ""}
            </Text>
            {/* Locked for a private account until you match - checked on the
                server too, not just hidden here. */}
            <PostsSection accessToken={accessToken} userId={userId} isOwner={state.self} />
          </View>

          {!state.self && likeStatus !== "accepted" && !page.canMessage && (
            <View
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: radius.lg,
                backgroundColor: palette.paperSand,
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons
                name="lock-closed-outline"
                size={26}
                color={palette.navy}
              />
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: typeScale.section,
                  color: palette.ink,
                  textAlign: "center",
                }}
              >
                {page.messageBlockedReason === "blocked"
                  ? "You cannot message this account"
                  : "Chat opens on a match"}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: palette.slate,
                  textAlign: "center",
                  lineHeight: 19,
                  maxWidth: 360,
                }}
              >
                {page.messageBlockedReason === "blocked"
                  ? "Messaging is unavailable between your accounts."
                  : likeStatus === "pending"
                    ? `${user.username} has your like. The chat opens if they like you back.`
                    : likeStatus === "likes_you"
                      ? `${user.username} liked you. Accept and the chat opens for both of you.`
                      : `Like ${user.username}. If they like you back, the chat opens for both of you.`}
              </Text>
            </View>
          )}

          {!!error && (
            <Text
              accessibilityRole="alert"
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                color: palette.crimson,
                textAlign: "center",
                marginTop: 12,
              }}
            >
              {error}
            </Text>
          )}
        </View>
        {!state.self && (
          <Text
            accessibilityRole="button"
            accessibilityLabel={muted ? "Unmute this account" : "Mute this account"}
            onPress={() => void toggleMute()}
            style={{ alignSelf: "center", marginTop: 24, marginBottom: 12, fontFamily: fonts.bodySemi, fontSize: 13, color: palette.slate }}
          >
            {muted ? "Unmute" : "Mute"} {user.username}
          </Text>
        )}
      </ScrollView>
    </Shell>
  );
}

function Shell({
  children,
  navigate,
  navActive,
  onBlock,
}: {
  children: React.ReactNode;
  navigate: (screen: any) => void;
  navActive: string;
  onBlock?: () => void;
}) {
  const navInset = useNavInset();
  return (
    // One full-screen background in the app's cream, the same as your own Profile.
    <View style={{ flex: 1, backgroundColor: palette.paperBase }}>
      <SafeAreaView style={{ flex: 1, paddingLeft: navInset.paddingLeft }}>
        <View
          style={{
            width: "100%",
            maxWidth: MAX_WIDTH,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 12 + SIDE_PADDING,
            // Lined up with your own Profile's logo row.
            paddingTop: 32,
            paddingBottom: 4,
          }}
        >
          {/* The Apnajoda logo, as at the top of your own Profile. */}
          <Image source={brandLogo} style={{ width: 116, height: 32 }} resizeMode="contain" accessibilityLabel="Apnajoda" />
          <View style={{ flex: 1 }} />
          {onBlock && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Report or block"
              hitSlop={12}
              onPress={onBlock}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: palette.paper,
                borderWidth: 1,
                borderColor: palette.rule,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={18}
                color={palette.ink}
              />
            </Pressable>
          )}
        </View>
        {children}
        <BottomNav active={navActive} navigate={navigate} />
      </SafeAreaView>
    </View>
  );
}
