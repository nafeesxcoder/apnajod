import { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppCanvas } from "../../../components/AppCanvas";
import type { Match } from "../../../data";
import type { Screen } from "../../../app/navigation/types";
import { socialApi } from "../../../api/socialApi";
import { MASTER_HOBBIES } from "../../onboarding/screens/ProfileSetupScreen";

const PINK = "#E91E63";
const PINK_LIGHT = "#FCE4EC";
const DARK = "#1A1416";
const MUTED = "#635A5D";
const WHITE = "#FFFFFF";
const LINE = "#F0EAE0";

const MAX_WIDTH = 720;
const SIDE_PADDING = 16;
const GRID_GAP = 8;
const { width: WINDOW_WIDTH } = Dimensions.get("window");
const CONTENT_WIDTH = Math.min(WINDOW_WIDTH, MAX_WIDTH);
const POST_SIZE = (CONTENT_WIDTH - SIDE_PADDING * 2 - GRID_GAP * 2) / 3;

const COVER_URI =
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80";

function hobbyIcon(label: string) {
  const wanted = String(label).trim().toLowerCase();
  return MASTER_HOBBIES.find((h) => h.label.toLowerCase() === wanted)?.icon;
}

export function MatchDetailScreen({
  match,
  back,
  navigate,
  accessToken,
  onStartChat,
}: {
  match: Match;
  back: () => void;
  navigate: (screen: Screen) => void;
  accessToken?: string;
  onStartChat: () => void;
}) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canMessage, setCanMessage] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    socialApi
      .person(accessToken, match.id)
      .then((data) => {
        setIsFollowing(!!data.state?.following);
        setIsRequested(!!data.state?.requested);
        setCanMessage(!!data.canMessage);
      })
      .catch(() => {});
  }, [accessToken, match.id]);

  const handleFollow = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const status = await socialApi.follow(accessToken, match.id);
      if (status === "pending") {
        setIsRequested(true);
      } else {
        setIsFollowing(true);
        setCanMessage(true);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not follow.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!accessToken) return;
    try {
      await socialApi.unfollow(accessToken, match.id);
      setIsFollowing(false);
      setIsRequested(false);
      setCanMessage(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not unfollow.");
    }
  };

  const handleMessage = () => {
    if (canMessage) {
      onStartChat();
    } else {
      Alert.alert(
        "Follow to Chat",
        `Follow ${match.name} to start a conversation.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Follow", onPress: handleFollow },
        ],
      );
    }
  };

  const photos = match.photos?.length
    ? match.photos
    : match.photo
      ? [match.photo]
      : [];

  const hobbies: string[] = Array.isArray(match.hobbies) ? match.hobbies : [];
  const age = String(match.age ?? "").trim();
  const headline = [match.profession, match.city].filter(Boolean).join(" · ");
  const bio = String(match.about ?? "").trim();

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF5F9" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 90 }}
        >
          <View
            style={{ width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center" }}
          >
            {/* Cover Photo */}
            <View style={{ position: "relative", height: 160 }}>
              <Image
                source={{ uri: COVER_URI }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              <LinearGradient
                colors={[
                  "rgba(233,30,99,0.4)",
                  "transparent",
                  "rgba(255,245,249,1)",
                ]}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
              />

              {/* App Name */}
              <View
                style={{
                  position: "absolute",
                  top: 14,
                  left: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="heart" size={28} color={PINK} />
                <View>
                  <Text
                    style={{ color: DARK, fontSize: 22, fontWeight: "700" }}
                  >
                    apnajod
                  </Text>
                  <Text style={{ color: MUTED, fontSize: 10 }}>
                    Find Your Perfect Match ❤️
                  </Text>
                </View>
              </View>

              {/* Back Button */}
              <TouchableOpacity
                onPress={back}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 16,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.9)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="arrow-back" size={22} color={DARK} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: SIDE_PADDING }}>
              {/* Profile Photo + Verified */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginTop: -60,
                }}
              >
                <View style={{ position: "relative" }}>
                  <View
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      borderWidth: 4,
                      borderColor: PINK,
                      overflow: "hidden",
                      backgroundColor: "#FFF",
                    }}
                  >
                    {photos[0] ? (
                      <Image
                        source={{ uri: photos[0] }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <View
                        style={{
                          width: "100%",
                          height: "100%",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="person" size={50} color={PINK} />
                      </View>
                    )}
                  </View>
                  <View
                    style={{
                      position: "absolute",
                      bottom: 4,
                      right: 4,
                      backgroundColor: PINK,
                      borderRadius: 12,
                      padding: 4,
                    }}
                  >
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: PINK_LIGHT,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="shield-checkmark" size={16} color={PINK} />
                  <Text
                    style={{ fontSize: 12, color: PINK, fontWeight: "700" }}
                  >
                    Verified
                  </Text>
                </View>
              </View>

              {/* Name & Age */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 12,
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: "700", color: DARK }}>
                  {match.name}
                  {age ? `, ${age}` : ""}
                </Text>
                <Ionicons name="checkmark-circle" size={24} color={PINK} />
              </View>

              {/* City & Profession */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginTop: 6,
                  alignItems: "center",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Ionicons name="location" size={16} color={MUTED} />
                  <Text style={{ fontSize: 14, color: MUTED }}>
                    {match.city || "City not added"}
                  </Text>
                </View>
                <Text style={{ color: MUTED }}>|</Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Ionicons name="briefcase" size={16} color={MUTED} />
                  <Text style={{ fontSize: 14, color: MUTED }}>
                    {match.profession || "Profession not added"}
                  </Text>
                </View>
              </View>

              {/* Hobbies */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {hobbies.length > 0 ? (
                  hobbies.map((hobby) => {
                    const icon = hobbyIcon(hobby);
                    return (
                      <View
                        key={hobby}
                        style={{
                          backgroundColor: PINK_LIGHT,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {!!icon && (
                          <Ionicons name={icon as any} size={14} color={DARK} />
                        )}
                        <Text
                          style={{
                            fontSize: 12,
                            color: DARK,
                            fontWeight: "600",
                          }}
                        >
                          {hobby}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={{ fontSize: 13, color: MUTED }}>
                    No hobbies added
                  </Text>
                )}
              </View>

              {/* Follow & Message Buttons */}
              <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  onPress={
                    isFollowing || isRequested ? handleUnfollow : handleFollow
                  }
                  disabled={loading}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isFollowing ? WHITE : PINK,
                    borderWidth: isFollowing ? 2 : 0,
                    borderColor: PINK,
                    paddingVertical: 14,
                    borderRadius: 30,
                    gap: 8,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <Ionicons
                    name={
                      isFollowing
                        ? "person-remove-outline"
                        : isRequested
                          ? "time-outline"
                          : "person-add"
                    }
                    size={20}
                    color={isFollowing ? PINK : WHITE}
                  />
                  <Text
                    style={{
                      color: isFollowing ? PINK : WHITE,
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    {isFollowing
                      ? "Following"
                      : isRequested
                        ? "Requested"
                        : "Follow"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleMessage}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: canMessage ? DARK : WHITE,
                    borderWidth: canMessage ? 0 : 2,
                    borderColor: PINK,
                    paddingVertical: 14,
                    borderRadius: 30,
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={20}
                    color={canMessage ? WHITE : PINK}
                  />
                  <Text
                    style={{
                      color: canMessage ? WHITE : PINK,
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    Message
                  </Text>
                </TouchableOpacity>
              </View>

              {/* About Me */}
              <View
                style={{
                  backgroundColor: WHITE,
                  marginTop: 20,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: LINE,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name="sparkles" size={20} color={PINK} />
                  <Text
                    style={{ fontSize: 16, fontWeight: "700", color: DARK }}
                  >
                    About Me
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    color: bio ? MUTED : "#A0A0A0",
                    lineHeight: 22,
                  }}
                >
                  {bio || "No bio yet."}
                </Text>
              </View>

              {/* Photos */}
              {photos.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Ionicons name="images" size={20} color={PINK} />
                      <Text
                        style={{ fontSize: 16, fontWeight: "700", color: DARK }}
                      >
                        Photos
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: GRID_GAP,
                    }}
                  >
                    {photos.map((photo, index) => (
                      <Image
                        key={index}
                        source={{ uri: photo }}
                        style={{
                          width: POST_SIZE,
                          height: POST_SIZE,
                          borderRadius: 12,
                          backgroundColor: LINE,
                        }}
                        resizeMode="cover"
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppCanvas>
  );
}
