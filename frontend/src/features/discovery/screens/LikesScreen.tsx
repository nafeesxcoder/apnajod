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
import { BottomNav } from "../../../components/navigation/BottomNav";
import type { Screen } from "../../../app/navigation/types";
import type { Match } from "../../../data";
import { matchApi } from "../../../api/matchApi";
import { matchFromSocialUser } from "../../../domain/socialMatch";

const GOLD = "#8A2237";
const RUBY = "#1F5286";
const LINE = "#D3D6DA";
const PAPER = "#EFF0F2";

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
  hobbies: string[];
  photo: string;
  photos: string[];
  likedAt: string | null;
  /** pending: yours to accept. accepted: you liked back, chat is open. */
  status: "pending" | "accepted";
};

/**
 * A like, as the detail screen wants it.
 *
 * This was an inline require() inside the card's onPress that built a bare
 * social stub, so opening somebody who had liked you showed a name and a
 * grey circle - no photos, no bio - which is not enough to decide on. The
 * profile the server already sent is carried across instead.
 */
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
  match.hobbies = like.hobbies;
  return match;
}

/** "2 hours ago", the way a list of likes is actually read. */
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
  /** Called when accepting made it mutual, so the thread can be opened. */
  onMatched: (like: { userId: string; username: string; name: string; photo: string }) => void;
}) {
  const [likes, setLikes] = useState<IncomingLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);

  /**
   * Accepting is liking them back: the server turns two 'interested'
   * decisions into a mutual match, which is the only thing that opens a
   * conversation. Passing removes them from this list for good.
   *
   * An accepted like STAYS in the list, marked accepted. It used to vanish
   * the moment it was accepted, so the one thing a member most wants to see
   * happen left no trace that it had.
   */
  const decide = async (like: IncomingLike, decision: "interested" | "pass") => {
    if (!accessToken || deciding) return;
    setDeciding(like.userId);
    setError(null);
    try {
      const result = await matchApi.decide(accessToken, like.userId, decision);
      if (decision === "pass") {
        setLikes((current) => current.filter((row) => row.userId !== like.userId));
        return;
      }
      setLikes((current) =>
        current.map((row) =>
          row.userId === like.userId ? { ...row, status: "accepted" } : row,
        ),
      );
      if (result?.mutual) {
        // Straight into the conversation: accepting is the member saying
        // they want to talk, so making them find the thread afterwards is
        // one step too many.
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

  /** Open the thread with somebody already accepted. */
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
      <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }}>
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
                style={{ fontSize: 28, fontWeight: "700", color: "#151719" }}
              >
                Likes
              </Text>
              <Text style={{ fontSize: 13, color: "#5A5E63", marginTop: 4 }}>
                People who noticed you
              </Text>
            </View>
            {likes.length > 0 && (
              <View
                style={{
                  backgroundColor: RUBY,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}
                >
                  {likes.length} {likes.length === 1 ? "like" : "likes"}
                </Text>
              </View>
            )}
          </View>

          {/* Loading State */}
          {loading && (
            <View style={{ alignItems: "center", marginTop: 80 }}>
              <ActivityIndicator size="large" color={RUBY} />
              <Text style={{ fontSize: 14, color: "#5A5E63", marginTop: 16 }}>
                Checking for new likes…
              </Text>
            </View>
          )}

          {/* Error State */}
          {!loading && error && (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 24,
                marginHorizontal: 20,
                alignItems: "center",
                borderWidth: 1,
                borderColor: LINE,
              }}
            >
              <Ionicons name="cloud-offline-outline" size={48} color={GOLD} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#151719",
                  marginTop: 12,
                }}
              >
                Could not load likes
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#5A5E63",
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* Empty State */}
          {!loading && !error && likes.length === 0 && (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 32,
                marginHorizontal: 20,
                alignItems: "center",
                borderWidth: 1,
                borderColor: LINE,
                marginTop: 40,
              }}
            >
              <Ionicons name="heart-outline" size={64} color="#D3D6DA" />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#151719",
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                No new likes yet
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#5A5E63",
                  textAlign: "center",
                  marginTop: 8,
                  maxWidth: 280,
                  lineHeight: 20,
                }}
              >
                When someone likes you, they will appear here securely.
              </Text>
            </View>
          )}

          {/* Everyone who liked you, newest first */}
          {!loading && !error && likes.length > 0 && (
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              {likes.map((like) => {
                const accepted = like.status === "accepted";
                const busy = deciding === like.userId;
                return (
                  <View
                    key={like.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: LINE,
                      overflow: "hidden",
                    }}
                  >
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${like.name}'s profile`}
                      onPress={() => openDetail(matchFromLike(like))}
                      style={{ flexDirection: "row", padding: 12, gap: 12 }}
                    >
                      {like.photo ? (
                        <Image
                          source={{ uri: like.photo }}
                          style={{ width: 92, height: 112, borderRadius: 12 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 92,
                            height: 112,
                            borderRadius: 12,
                            backgroundColor: "#E5E7EA",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="person" size={34} color="#86A6C7" />
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
                              fontSize: 16,
                              fontWeight: "700",
                              color: "#151719",
                            }}
                          >
                            {like.name}
                            {like.age ? `, ${like.age}` : ""}
                          </Text>
                          {like.verified && (
                            <Ionicons name="checkmark-circle" size={15} color={RUBY} />
                          )}
                        </View>

                        {!!(like.city || like.profession) && (
                          <Text
                            numberOfLines={1}
                            style={{ fontSize: 12.5, color: "#5A5E63", marginTop: 2 }}
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
                              fontSize: 12.5,
                              lineHeight: 17,
                              color: "#5A5E63",
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
                              borderRadius: 999,
                              backgroundColor: accepted ? "#E6F4EE" : "#E6EDF5",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                letterSpacing: 0.3,
                                color: accepted ? "#17624A" : "#1F5286",
                              }}
                            >
                              {accepted ? "Accepted" : "Pending"}
                            </Text>
                          </View>
                          {!!sinceLabel(like.likedAt) && (
                            <Text style={{ fontSize: 11.5, color: "#7A8187" }}>
                              {sinceLabel(like.likedAt)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        paddingHorizontal: 12,
                        paddingBottom: 12,
                      }}
                    >
                      {accepted ? (
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Message ${like.name}`}
                          onPress={() => openChat(like)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 20,
                            backgroundColor: RUBY,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <Ionicons name="chatbubble" size={14} color="#FFFFFF" />
                          <Text
                            style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}
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
                              paddingVertical: 10,
                              borderRadius: 20,
                              borderWidth: 1,
                              borderColor: LINE,
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{ fontSize: 13, fontWeight: "600", color: "#5A5E63" }}
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
                              paddingVertical: 10,
                              borderRadius: 20,
                              backgroundColor: RUBY,
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
                                <Ionicons name="heart" size={14} color="#FFFFFF" />
                                <Text
                                  style={{
                                    fontSize: 13,
                                    fontWeight: "700",
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
                  fontSize: 13,
                  color: "#7A8187",
                  textAlign: "center",
                  marginTop: 4,
                  marginBottom: 24,
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
