import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  type ImageStyle,
  ScrollView,
  type StyleProp,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { HeartBeat } from "../../../components/motion";

import { AppCanvas } from "../../../components/AppCanvas";
import {
  BottomNav,
  useNavInset,
} from "../../../components/navigation/BottomNav";
import type { Screen } from "../../../app/navigation/types";
import type { Match } from "../../../data";
import { matchApi, type MutualMatchSummary } from "../../../api/matchApi";
import { matchFromSocialUser } from "../../../domain/socialMatch";
import { colors, fonts, palette, radius, typeScale } from "../../../theme";
import { serverMs } from "../../../domain/serverTime";
import { ActivityRow, loadActivity } from "../../posts/ActivityList";
import type { ActivityItem } from "../../../api/postApi";

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
  /** They sent a Spark or a Super Like with this like. */
  spark?: { kind: "spark" | "superlike"; note: string } | null;
};

/**
 * A photo that shows the placeholder when there is no picture, or when the
 * picture fails to load. That is what left some avatars blank.
 */
function PhotoOrFallback({
  uri,
  style,
  fallback,
}: {
  uri: string;
  style: StyleProp<ImageStyle>;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [uri]);
  if (!uri || failed) return <>{fallback}</>;
  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

function LikeRow({
  like,
  busy,
  onAccept,
  onPass,
  onOpen,
}: {
  like: IncomingLike;
  busy: boolean;
  onAccept: () => void;
  onPass: () => void;
  onOpen: () => void;
}) {
  const locked = !!like.locked;
  const matched = like.status === "accepted";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: palette.ruleSoft,
      }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={locked ? "Someone liked your profile" : `Open ${like.name}'s profile`}
        disabled={locked}
        onPress={onOpen}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        {locked ? (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: palette.paperSand,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="lock-closed" size={18} color={palette.slate} />
          </View>
        ) : (
          <PhotoOrFallback
            uri={like.photo}
            style={{ width: 44, height: 44, borderRadius: 22 }}
            fallback={<View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: palette.paperSand }} />}
          />
        )}
        <Text numberOfLines={2} style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: palette.ink, lineHeight: 20 }}>
          {locked ? (
            "Someone liked your profile"
          ) : (
            <>
              <Text style={{ fontFamily: fonts.bodyBold }}>{like.username || like.name}</Text>
              <Text>{" liked your profile"}</Text>
            </>
          )}
          <Text style={{ color: palette.slate }}>{`  ${sinceLabel(like.likedAt)}`}</Text>
          <Text style={{ color: matched ? palette.navy : palette.slate, fontFamily: fonts.bodySemi }}>
            {`
${matched ? "Accepted" : "Pending"}`}
          </Text>
          {!!like.spark && (
            <Text style={{ color: palette.crimson, fontFamily: fonts.bodySemi }}>
              {`
${like.spark.kind === "superlike" ? "⭐ Super Like" : "Spark"}${like.spark.note ? ` · ${like.spark.note}` : ""}`}
            </Text>
          )}
        </Text>
      </TouchableOpacity>
      {!locked && !matched && (
        <View
          accessibilityRole="radiogroup"
          style={{
            flexDirection: "row",
            padding: 3,
            borderRadius: radius.pill,
            backgroundColor: palette.paperSand,
            borderWidth: 1,
            borderColor: palette.rule,
            opacity: busy ? 0.6 : 1,
          }}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Pass on ${like.name}`}
            disabled={busy}
            onPress={onPass}
            style={{ width: 40, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="close" size={18} color={palette.slate} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Accept ${like.name}`}
            disabled={busy}
            onPress={onAccept}
            style={{
              height: 34,
              paddingHorizontal: 14,
              borderRadius: radius.pill,
              backgroundColor: palette.crimson,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              shadowColor: palette.crimson,
              shadowOpacity: 0.25,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <HeartBeat>
                  <Ionicons name="heart" size={13} color="#FFFFFF" />
                </HeartBeat>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: typeScale.label, color: "#FFFFFF" }}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  const then = serverMs(iso);
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

/** Matches from the last 30 days, newest first: tap one to say hello. */
const NEW_MATCH_DAYS = 30;

function recentMatches(list: MutualMatchSummary[], now = Date.now()) {
  const since = now - NEW_MATCH_DAYS * 24 * 60 * 60 * 1000;
  return list.filter((m) => {
    const at = m.matchedAt ? serverMs(m.matchedAt) || 0 : 0;
    return at >= since;
  });
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: fonts.bodySemi,
        fontSize: 13,
        color: palette.slate,
        letterSpacing: 0.4,
        paddingHorizontal: 20,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

function NewMatchesRow({
  matches,
  onOpen,
}: {
  matches: MutualMatchSummary[];
  onOpen: (match: MutualMatchSummary) => void;
}) {
  return (
    <View style={{ marginBottom: 22 }}>
      <SectionLabel>NEW MATCHES</SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
      >
        {matches.map((match) => (
          <TouchableOpacity
            key={match.id}
            accessibilityRole="button"
            accessibilityLabel={`You matched with ${match.name}. Open chat`}
            onPress={() => onOpen(match)}
            style={{ alignItems: "center", width: 72 }}
          >
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 33,
                borderWidth: 2,
                borderColor: palette.crimson,
                padding: 2,
              }}
            >
              <PhotoOrFallback
                uri={match.photo}
                style={{ width: "100%", height: "100%", borderRadius: 30 }}
                fallback={
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 30,
                      backgroundColor: palette.paper,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text }}>
                      {(match.name || "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                }
              />
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.bodySemi,
                fontSize: 12,
                color: colors.text,
                marginTop: 6,
              }}
            >
              {match.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export function LikesScreen({
  navigate,
  accessToken,
  openDetail,
  onMatched,
  onOpenChat,
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
  /** Open the chat with someone already matched. */
  onOpenChat?: (person: {
    userId: string;
    username: string;
    name: string;
    photo: string;
  }) => void;
}) {
  const navInset = useNavInset();
  const [likes, setLikes] = useState<IncomingLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [newMatches, setNewMatches] = useState<MutualMatchSummary[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const feed = [
    ...likes.map((like) => ({ key: `like-${like.id}`, at: serverMs(like.likedAt ?? "") || 0, like, item: null as ActivityItem | null })),
    ...activity.map((item, index) => ({ key: `act-${index}`, at: serverMs(item.at) || 0, like: null, item })),
  ].sort((x, y) => y.at - x.at);

  // Opening this page is reading the notifications: the bell goes back to 0.
  // New matches load on their own so a slow list never holds up the likes.
  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    void matchApi.markNotificationsSeen(accessToken).catch(() => undefined);
    matchApi
      .getMatches(accessToken)
      .then((result) => {
        if (live) setNewMatches(recentMatches((result.matches as MutualMatchSummary[]) || []));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    loadActivity(accessToken)
      .then((items) => live && setActivity(items))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [accessToken]);

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
                Notifications
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: typeScale.label,
                  color: colors.muted,
                  marginTop: 4,
                }}
              >
                Likes, matches and activity on your posts
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

          <>
          {newMatches.length > 0 && (
            <NewMatchesRow
              matches={newMatches}
              onOpen={(match) =>
                (onOpenChat ?? onMatched)({
                  userId: match.id,
                  username: match.username || "",
                  name: match.name,
                  photo: match.photo,
                })
              }
            />
          )}


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
          {!loading && !error && feed.length === 0 && (
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
                Nothing new yet
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
                When someone likes you, or likes or comments on your posts, it shows up here. Your own likes and comments don't.
              </Text>
            </View>
          )}

          {!loading && !error && feed.length > 0 && (
            <View style={{ paddingHorizontal: 16 }}>
              {feed.map((row) =>
                row.like ? (
                  <LikeRow
                    key={row.key}
                    like={row.like}
                    busy={deciding === row.like.userId}
                    onAccept={() => void decide(row.like!, "interested")}
                    onPass={() => void decide(row.like!, "pass")}
                    onOpen={() => openDetail(matchFromLike(row.like!))}
                  />
                ) : (
                  <ActivityRow key={row.key} item={row.item!} />
                ),
              )}
            </View>
          )}
          </>
        </ScrollView>

        <BottomNav active="home" navigate={navigate} />
      </SafeAreaView>
    </AppCanvas>
  );
}
