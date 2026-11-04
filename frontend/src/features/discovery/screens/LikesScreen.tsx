import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";
import { BottomNav } from "../../../components/navigation/BottomNav";
import type { Screen } from "../../../app/navigation/types";
import type { Match } from "../../../data";
import { matchApi } from "../../../api/matchApi";

const GOLD = "#8A6722";
const RUBY = "#8A1B35";
const LINE = "#E2D9CB";
const PAPER = "#F8F3E9";

type IncomingLike = {
  id: string;
  userId: string;
  username: string;
  name: string;
  age: number;
  city: string;
  profession: string;
  gender: string;
  photo: string;
  photos: string[];
  likedAt: string | null;
};

export function LikesScreen({
  navigate,
  accessToken,
  openDetail,
}: {
  navigate: (screen: Screen) => void;
  accessToken?: string;
  openDetail: (match: Match) => void;
}) {
  const [likes, setLikes] = useState<IncomingLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                style={{ fontSize: 28, fontWeight: "700", color: "#1A1416" }}
              >
                Likes
              </Text>
              <Text style={{ fontSize: 13, color: "#635A5D", marginTop: 4 }}>
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
              <Text style={{ fontSize: 14, color: "#635A5D", marginTop: 16 }}>
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
                  color: "#1A1416",
                  marginTop: 12,
                }}
              >
                Could not load likes
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#635A5D",
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
              <Ionicons name="heart-outline" size={64} color="#E2D9CB" />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#1A1416",
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                No new likes yet
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#635A5D",
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

          {/* Likes Grid */}
          {!loading && !error && likes.length > 0 && (
            <View style={{ paddingHorizontal: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                }}
              >
                {likes.map((like) => (
                  <TouchableOpacity
                    key={like.id}
                    style={{
                      width: "48%",
                      marginBottom: 16,
                      borderRadius: 16,
                      overflow: "hidden",
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: LINE,
                    }}
                    onPress={() => {
                      const socialUser = {
                        userId: like.userId,
                        username: like.username || "member",
                        name: like.name,
                        avatarUrl: like.photo || null,
                        isPrivate: false,
                      };
                      const {
                        matchFromSocialUser,
                      } = require("../../../domain/socialMatch");
                      const match = matchFromSocialUser(socialUser);
                      match.age = like.age;
                      match.city = like.city;
                      match.profession = like.profession;
                      match.gender = like.gender as any;
                      match.photos = like.photos;
                      match.photo = like.photo;
                      openDetail(match);
                    }}
                  >
                    <View style={{ position: "relative" }}>
                      <Image
                        source={{
                          uri:
                            like.photo || "https://via.placeholder.com/300x360",
                        }}
                        style={{ width: "100%", height: 220 }}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.75)"]}
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: 100,
                          justifyContent: "flex-end",
                          padding: 12,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: "#FFFFFF",
                          }}
                        >
                          {like.name}, {like.age}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: "rgba(255,255,255,0.85)",
                            marginTop: 2,
                          }}
                        >
                          {like.city.split(",")[0]}
                        </Text>
                      </LinearGradient>

                      {/* Heart Badge */}
                      <View
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          backgroundColor: RUBY,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="heart" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Footer CTA */}
              <Text
                style={{
                  fontSize: 14,
                  color: "#635A5D",
                  textAlign: "center",
                  marginTop: 8,
                  marginBottom: 24,
                  paddingHorizontal: 20,
                }}
              >
                Like them back to start chatting.
              </Text>
            </View>
          )}
        </ScrollView>

        <BottomNav active="likes" navigate={navigate} />
      </SafeAreaView>
    </AppCanvas>
  );
}
