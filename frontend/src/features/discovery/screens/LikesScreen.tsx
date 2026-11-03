import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { SectionTitle, shared } from "../../../components";
import { BottomNav } from "../../../components/navigation/BottomNav";
import { PremiumIcon } from "../../../components/premium/PremiumIcon";
import type { Screen } from "../../../app/navigation/types";
import { styles } from "../../../theme/appStyles";
import { AppCanvas } from "../../../components/AppCanvas";
import { matchApi } from "../../../api/matchApi";
import type { Match } from "../../../data";
import { matchFromSocialUser } from "../../../domain/socialMatch"; // <-- YEH IMPORT ADD KIYA

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

  if (loading) {
    return (
      <AppCanvas>
        <SafeAreaView
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#800000" />
          <Text style={[styles.helper, { marginTop: 16 }]}>
            Checking for new likes...
          </Text>
        </SafeAreaView>
      </AppCanvas>
    );
  }

  if (error) {
    return (
      <AppCanvas>
        <SafeAreaView
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 22,
          }}
        >
          <Text style={styles.cardTitle}>Could not load likes</Text>
          <Text style={[styles.helper, { textAlign: "center", marginTop: 8 }]}>
            {error}
          </Text>
        </SafeAreaView>
      </AppCanvas>
    );
  }

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 22, paddingBottom: 120, gap: 25 }}
        >
          <SectionTitle
            eyebrow="Private & intentional"
            title="People who noticed you."
            body={
              likes.length > 0
                ? "These people liked your profile. Like them back to start chatting."
                : "When someone likes you, they will appear here."
            }
          />

          {likes.length === 0 ? (
            <View style={[shared.card, { gap: 12, alignItems: "center" }]}>
              <PremiumIcon
                name="lock-closed"
                tone="gold"
                size={54}
                iconSize={25}
              />
              <Text style={styles.cardTitle}>No new likes yet</Text>
              <Text style={[styles.helper, { textAlign: "center" }]}>
                Keep browsing. When someone likes you, it will appear here
                securely.
              </Text>
            </View>
          ) : (
            <View style={styles.likesGrid}>
              {likes.map((like) => (
                <TouchableOpacity
                  key={like.id}
                  style={styles.likeCard}
                  onPress={() => {
                    // Convert to SocialUser format and use the helper
                    const socialUser = {
                      userId: like.userId,
                      username: like.username || "member",
                      name: like.name,
                      avatarUrl: like.photo || null,
                      isPrivate: false,
                    };

                    // matchFromSocialUser returns a perfectly valid Match object
                    const match = matchFromSocialUser(socialUser);

                    // Fill in real data from the like payload
                    match.age = like.age;
                    match.city = like.city;
                    match.profession = like.profession;
                    match.gender = like.gender as any;
                    match.photos = like.photos;
                    match.photo = like.photo;

                    openDetail(match);
                  }}
                >
                  <Image
                    source={{
                      uri: like.photo || "https://via.placeholder.com/150",
                    }}
                    style={styles.fill}
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(18,14,15,.9)"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={{ padding: 12 }}>
                    <Text style={styles.likeText}>
                      {like.name}, {like.age}
                    </Text>
                    <Text
                      style={[
                        styles.helper,
                        { color: "white", marginTop: 4, fontSize: 12 },
                      ]}
                    >
                      {like.city.split(",")[0]}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
        <BottomNav active="likes" navigate={navigate} />
      </SafeAreaView>
    </AppCanvas>
  );
}
