import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";
import {
  BottomNav,
  useNavInset,
} from "../../../components/navigation/BottomNav";
import { useLayout } from "../../../layout/useLayout";
import type { Screen } from "../../../app/navigation/types";
import type { Match } from "../../../data";
import { matchApi } from "../../../api/matchApi";
import { matchFromSocialUser } from "../../../domain/socialMatch";
import { colors, fonts, palette, radius, typeScale } from "../../../theme";
import { TrustBadge } from "../../../components/TrustBadge";

type IncomingLike = {
  id: string;
  userId: string;
  username: string;
  name: string;
  age: number;
  city: string;
  profession: string;
  gender: string;
  about: string;
  verified: boolean;
  blueTick?: boolean;
  hobbies: string[];
  photo: string;
  photos: string[];
  likedAt: string | null;
  status: "pending" | "accepted";
  locked?: boolean;
};

const LIKE_CARD_WIDTH = 420;

function LockedLikeCard({
  likedAt,
  wide,
  onUnlock,
}: {
  likedAt: string | null;
  wide: boolean;
  onUnlock?: () => void;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.paperSand,
          borderRadius: radius.lg,
          overflow: "hidden",
        },
        wide && { width: LIKE_CARD_WIDTH },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          padding: 14,
          gap: 14,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 92,
            height: 112,
            borderRadius: radius.md,
            backgroundColor: palette.paper,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="lock-closed" size={26} color={palette.slate} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: typeScale.section,
              color: colors.text,
            }}
          >
            Someone liked you
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: typeScale.label,
              color: colors.muted,
            }}
          >
            {sinceLabel(likedAt)}
          </Text>
        </View>
      </View>
      {onUnlock && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="See who liked you with Premium"
          onPress={onUnlock}
          style={{
            margin: 14,
            marginTop: 0,
            paddingVertical: 13,
            borderRadius: radius.pill,
            backgroundColor: palette.navy,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: fonts.bodySemi,
              fontSize: typeScale.body,
            }}
          >
            See who it is
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function matchFromLike(like: IncomingLike): Match {
  const match = matchFromSocialUser({
    userId: like.userId,
    username: like.username || "member",
    name: like.name,
    avatarUrl: like.photo || null,
    isPrivate: false,
  });
  match.age = like.age;
  match.city = like.city;
  match.profession = like.profession;
  match.gender = like.gender as Match["gender"];
  match.photos = like.photos;
  match.photo = like.photo;
  match.about = like.about;
  match.verified = like.verified;
  match.blueTick = like.blueTick === true;
  match.hobbies = like.hobbies;
  return match;
}

function sinceLabel(iso: string | null) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function LikesScreen({
  navigate,
  accessToken,
  openDetail,
  onMatched,
}: {
  navigate: (screen: Screen) => void;
  accessToken?: string;
  openDetail: (match: Match) => void;
  onMatched: (like: {
    userId: string;
    username: string;
    name: string;
    photo: string;
  }) => void;
}) {
  const navInset = useNavInset();
  const { isWide: isWideLikes } = useLayout();
  const [likes, setLikes] = useState<IncomingLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);

  const decide = async (
    like: IncomingLike,
    decision: "interested" | "pass",
  ) => {
    if (!accessToken || deciding) return;
    setDeciding(like.userId);
    setError(null);
    try {
      const result = await matchApi.decide(accessToken, like.userId, decision);
      if (decision === "pass") {
        setLikes((current) =>
          current.filter((row) => row.userId !== like.userId),
        );
        return;
      }
      setLikes((current) =>
        current.map((row) =>
          row.userId === like.userId ? { ...row, status: "accepted" } : row,
        ),
      );
      if (result?.mutual) {
        onMatched({
          userId: like.userId,
          username: like.username || "",
          name: like.name,
          photo: like.photo,
        });
      }
    } catch (err: any) {
      setError(err.message || "That did not go through. Try again.");
    } finally {
      setDeciding(null);
    }
  };

  const openChat = (like: IncomingLike) =>
    onMatched({
      userId: like.userId,
      username: like.username || "",
      name: like.name,
      photo: like.photo,
    });

  useEffect(() => {
    let isMounted = true;

    async function fetchLikes() {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await matchApi.getIncomingLikes(accessToken);
        if (isMounted) {
          setLikes(response.likes || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load likes.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchLikes();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

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
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: typeScale.title,
                  color: colors.text,
                }}
              >
                Likes
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: typeScale.label,
                  color: colors.muted,
                  marginTop: 4,
                }}
              >
                People who noticed you
              </Text>
            </View>
            {likes.length > 0 && (
              <View
                style={{
                  backgroundColor: palette.crimson,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: fonts.bodyBold,
                    fontSize: typeScale.label,
                  }}
                >
                  {likes.length} {likes.length === 1 ? "like" : "likes"}
                </Text>
              </View>
            )}
          </View>

          {/* Loading */}
          {loading && (
            <View style={{ alignItems: "center", marginTop: 80 }}>
              <ActivityIndicator size="large" color={palette.crimson} />
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: typeScale.body,
                  color: colors.muted,
                  marginTop: 16,
                }}
              >
                Checking for new likes…
              </Text>
            </View>
          )}

          {/* Error — unboxed */}
          {!loading && error && (
            <View
              style={{
                alignItems: "center",
                paddingHorizontal: 20,
                marginTop: 40,
              }}
            >
              <Ionicons
                name="cloud-offline-outline"
                size={48}
                color={palette.crimson}
              />
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: typeScale.section,
                  color: colors.text,
                  marginTop: 14,
                }}
              >
                Could not load likes
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: typeScale.body,
                  color: colors.muted,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* Empty — unboxed */}
          {!loading && !error && likes.length === 0 && (
            <View
              style={{
                alignItems: "center",
                paddingHorizontal: 20,
                marginTop: 60,
              }}
            >
              <Ionicons
                name="heart-outline"
                size={64}
                color={palette.crimson}
              />
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: typeScale.section,
                  color: colors.text,
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                No new likes yet
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: typeScale.body,
                  color: colors.muted,
                  textAlign: "center",
                  marginTop: 8,
                  maxWidth: 280,
                  lineHeight: 22,
                }}
              >
                When someone likes you, they will appear here securely.
              </Text>
            </View>
          )}

          {/* Likes list */}
          {!loading && !error && likes.length > 0 && (
            <View
              style={[
                { paddingHorizontal: 20, gap: 14 },
                isWideLikes && {
                  flexDirection: "row" as const,
                  flexWrap: "wrap" as const,
                },
              ]}
            >
              {likes.map((like) => {
                const accepted = like.status === "accepted";
                const busy = deciding === like.userId;
                if (like.locked) {
                  return (
                    <LockedLikeCard
                      key={like.id}
                      likedAt={like.likedAt}
                      wide={isWideLikes}
                    />
                  );
                }
                return (
                  <View
                    key={like.id}
                    style={[
                      {
                        backgroundColor: palette.paperSand,
                        borderRadius: radius.lg,
                        overflow: "hidden",
                      },
                      isWideLikes && { width: LIKE_CARD_WIDTH },
                    ]}
                  >
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${like.name}'s profile`}
                      onPress={() => openDetail(matchFromLike(like))}
                      style={{ flexDirection: "row", padding: 14, gap: 14 }}
                    >
                      {like.photo ? (
                        <Image
                          source={{ uri: like.photo }}
                          style={{
                            width: 92,
                            height: 112,
                            borderRadius: radius.md,
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 92,
                            height: 112,
                            borderRadius: radius.md,
                            backgroundColor: palette.paper,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons
                            name="person"
                            size={34}
                            color={palette.navySoft}
                          />
                        </View>
                      )}

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Text
                            numberOfLines={1}
                            style={{
                              flexShrink: 1,
                              fontFamily: fonts.display,
                              fontSize: typeScale.section,
                              color: colors.text,
                            }}
                          >
                            {like.name}
                            {like.age ? `, ${like.age}` : ""}
                          </Text>
                          {like.verified && <TrustBadge blueTick={like.blueTick} size={17} />}
                        </View>

                        {!!(like.city || like.profession) && (
                          <Text
                            numberOfLines={1}
                            style={{
                              fontFamily: fonts.body,
                              fontSize: typeScale.caption,
                              color: colors.muted,
                              marginTop: 2,
                            }}
                          >
                            {[like.city.split(",")[0], like.profession]
                              .filter(Boolean)
                              .join("  ·  ")}
                          </Text>
                        )}

                        {!!like.about && (
                          <Text
                            numberOfLines={2}
                            style={{
                              fontFamily: fonts.body,
                              fontSize: typeScale.caption,
                              lineHeight: 17,
                              color: colors.muted,
                              marginTop: 6,
                            }}
                          >
                            {like.about}
                          </Text>
                        )}

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 8,
                          }}
                        >
                          <View
                            style={{
                              paddingHorizontal: 9,
                              paddingVertical: 3,
                              borderRadius: radius.pill,
                              backgroundColor: accepted
                                ? palette.marigoldTint
                                : palette.navySoft,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: fonts.bodySemi,
                                fontSize: typeScale.caption,
                                color: accepted
                                  ? palette.emerald
                                  : palette.navyDeep,
                              }}
                            >
                              {accepted ? "Accepted" : "Pending"}
                            </Text>
                          </View>
                          {!!sinceLabel(like.likedAt) && (
                            <Text
                              style={{
                                fontFamily: fonts.body,
                                fontSize: 11.5,
                                color: colors.muted,
                              }}
                            >
                              {sinceLabel(like.likedAt)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    <View
                      style={{
                        flexDirection: "row",
                        gap: 10,
                        paddingHorizontal: 14,
                        paddingBottom: 14,
                      }}
                    >
                      {accepted ? (
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Message ${like.name}`}
                          onPress={() => openChat(like)}
                          style={{
                            flex: 1,
                            paddingVertical: 11,
                            borderRadius: radius.pill,
                            backgroundColor: palette.navy,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <Ionicons
                            name="chatbubble"
                            size={14}
                            color="#FFFFFF"
                          />
                          <Text
                            style={{
                              fontFamily: fonts.bodySemi,
                              fontSize: typeScale.label,
                              color: "#FFFFFF",
                            }}
                          >
                            Message
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`Pass on ${like.name}`}
                            disabled={busy}
                            onPress={() => decide(like, "pass")}
                            style={{
                              flex: 1,
                              paddingVertical: 11,
                              borderRadius: radius.pill,
                              borderWidth: 1,
                              borderColor: palette.rule,
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: fonts.bodyMedium,
                                fontSize: typeScale.label,
                                color: colors.muted,
                              }}
                            >
                              Pass
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`Accept ${like.name} and open a chat`}
                            disabled={busy}
                            onPress={() => decide(like, "interested")}
                            style={{
                              flex: 1,
                              paddingVertical: 11,
                              borderRadius: radius.pill,
                              backgroundColor: palette.navy,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              opacity: busy ? 0.6 : 1,
                            }}
                          >
                            {busy ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Ionicons
                                  name="heart"
                                  size={14}
                                  color="#FFFFFF"
                                />
                                <Text
                                  style={{
                                    fontFamily: fonts.bodySemi,
                                    fontSize: typeScale.label,
                                    color: "#FFFFFF",
                                  }}
                                >
                                  Accept
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}

              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: typeScale.label,
                  color: colors.muted,
                  textAlign: "center",
                  marginTop: 6,
                  marginBottom: 24,
                  width: "100%",
                }}
              >
                Accepting opens the chat for both of you.
              </Text>
            </View>
          )}
        </ScrollView>

        <BottomNav active="likes" navigate={navigate} />
      </SafeAreaView>
    </AppCanvas>
  );
}
