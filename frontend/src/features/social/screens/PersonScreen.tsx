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

import type { PersonPage } from "../../../api/socialApi";
import { fonts, palette, radius, typeScale } from "../../../theme";
import { TrustBadge } from "../../../components/TrustBadge";

const MAX_WIDTH = 720;
const SIDE_PADDING = 16;

export function PersonScreen({
  userId,
  onBack,
  onLoad,
  onFollow,
  onMessage,
  onBlock,
}: {
  userId: string;
  onBack: () => void;
  onLoad: (userId: string) => Promise<PersonPage>;
  onFollow: (userId: string) => Promise<"accepted" | "pending">;
  onMessage: (page: PersonPage) => void;
  onBlock?: (userId: string) => void;
}) {
  const [page, setPage] = useState<PersonPage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      const outcome = await onFollow(userId);
      const fresh = await onLoad(userId).catch(() => null);
      if (fresh) setPage(fresh);
      if (outcome === "accepted" || fresh?.like.matched) {
        onMessage(fresh ?? page);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !page) {
    return (
      <Shell onBack={onBack}>
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
      <Shell onBack={onBack}>
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

  return (
    <Shell
      onBack={onBack}
      onBlock={onBlock ? () => onBlock(userId) : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: 12,
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
            backgroundColor: palette.paper,
            borderRadius: radius.xl,
            paddingHorizontal: SIDE_PADDING,
            paddingVertical: 20,
          }}
        >
          <View style={{ alignItems: "center", marginTop: 4 }}>
            {cover ? (
              <Image
                source={{ uri: cover }}
                style={{
                  width: 132,
                  height: 132,
                  borderRadius: 66,
                  borderWidth: 3,
                  borderColor: palette.crimson,
                  backgroundColor: palette.paperSand,
                }}
                resizeMode="cover"
                accessibilityLabel={`${user.name}'s photo`}
              />
            ) : (
              <View
                style={{
                  width: 132,
                  height: 132,
                  borderRadius: 66,
                  borderWidth: 3,
                  borderColor: palette.crimson,
                  backgroundColor: palette.paperSand,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 52,
                    color: palette.crimson,
                  }}
                >
                  {(user.username || "?").slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 14,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 28,
                color: palette.ink,
                textAlign: "center",
              }}
            >
              {user.name}
              {profile.age ? `, ${profile.age}` : ""}
            </Text>
            {profile.verified && <TrustBadge blueTick={profile.blueTick} size={22} label />}
          </View>

          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 14,
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
                marginTop: 4,
              }}
            >
              {[profile.city, profile.profession].filter(Boolean).join("  ·  ")}
            </Text>
          )}

          {likeStatus !== "none" && (
            <View
              style={{
                alignSelf: "center",
                marginTop: 10,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: radius.pill,
                backgroundColor:
                  likeStatus === "accepted"
                    ? palette.marigoldTint
                    : palette.paperSand,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 12,
                  color:
                    likeStatus === "accepted" ? palette.emerald : palette.navy,
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

          {!state.self && (
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 20,
              }}
            >
              {likeStatus === "accepted" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${user.username}`}
                  onPress={() => onMessage(page)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: palette.navy,
                    paddingVertical: 12,
                    borderRadius: radius.pill,
                    minHeight: 44,
                  }}
                >
                  <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: fonts.bodySemi,
                      fontSize: 14,
                    }}
                  >
                    Message
                  </Text>
                </Pressable>
              ) : likeStatus === "pending" ? (
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: palette.paperSand,
                    paddingVertical: 12,
                    borderRadius: radius.pill,
                    minHeight: 44,
                  }}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={palette.slate}
                  />
                  <Text
                    style={{
                      color: palette.slate,
                      fontFamily: fonts.bodySemi,
                      fontSize: 14,
                    }}
                  >
                    Pending
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    likeStatus === "likes_you"
                      ? `Accept ${user.username} and open a chat`
                      : `Like ${user.username}`
                  }
                  disabled={busy}
                  onPress={() => void like()}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: palette.navy,
                    paddingVertical: 12,
                    borderRadius: radius.pill,
                    minHeight: 44,
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="heart" size={16} color="#FFFFFF" />
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontFamily: fonts.bodySemi,
                          fontSize: 14,
                        }}
                      >
                        {likeStatus === "likes_you" ? "Accept" : "Like"}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          )}

          {!!profile.about && (
            <View
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTopWidth: 1,
                borderTopColor: palette.rule,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: typeScale.section,
                  color: palette.ink,
                  marginBottom: 6,
                }}
              >
                About
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: palette.inkSoft,
                  lineHeight: 22,
                }}
              >
                {profile.about}
              </Text>
            </View>
          )}

          {profile.hobbies.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 20,
              }}
            >
              {profile.hobbies.map((hobby) => (
                <View
                  key={hobby}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: palette.rule,
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemi,
                      fontSize: 12,
                      color: palette.ink,
                    }}
                  >
                    {hobby}
                  </Text>
                </View>
              ))}
            </View>
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

          {!state.self && likeStatus !== "accepted" && (
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
                color: palette.clay,
                textAlign: "center",
                marginTop: 12,
              }}
            >
              {error}
            </Text>
          )}
        </View>
      </ScrollView>
    </Shell>
  );
}

function Shell({
  children,
  onBack,
  onBlock,
}: {
  children: React.ReactNode;
  onBack: () => void;
  onBlock?: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: palette.paperBase }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            width: "100%",
            maxWidth: MAX_WIDTH,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 12 + SIDE_PADDING,
            paddingVertical: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={onBack}
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
            <Ionicons name="arrow-back" size={18} color={palette.ink} />
          </Pressable>
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
      </SafeAreaView>
    </View>
  );
}
