import { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { fonts, palette, radius, typeScale } from "../../../theme";

import { AppCanvas } from "../../../components/AppCanvas";
import type { Match } from "../../../data";
import type { Screen } from "../../../app/navigation/types";
import { socialApi } from "../../../api/socialApi";
import { matchApi } from "../../../api/matchApi";
import { PostsSection } from "../../profile/components/PostsSection";
import { MASTER_HOBBIES } from "../../onboarding/screens/ProfileSetupScreen";
import { TrustBadge } from "../../../components/TrustBadge";
import { IntentSection } from "../../../components/IntentBadges";
import { InfoCard } from "../../../components/InfoCard";
import { GlowPulse, HeartBeat, PressScale, Reveal } from "../../../components/motion";

const MAX_WIDTH = 720;
const SIDE_PADDING = 16;
const brandLogo = require("../../../../assets/apnajoda-logo.png");

function hobbyIcon(label: string) {
  const wanted = String(label).trim().toLowerCase();
  return MASTER_HOBBIES.find((h) => h.label.toLowerCase() === wanted)?.icon;
}

export function MatchDetailScreen({
  match,
  navigate,
  accessToken,
  onStartChat,
}: {
  match: Match;
  back?: () => void;
  navigate: (screen: Screen) => void;
  accessToken?: string;
  onStartChat: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [canMessage, setCanMessage] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    socialApi
      .person(accessToken, match.id)
      .then((data) => setCanMessage(!!data.canMessage))
      .catch(() => {});
  }, [accessToken, match.id]);

  const handleLike = async () => {
    if (!accessToken || liked) return;
    setLoading(true);
    try {
      const result = await matchApi.decide(accessToken, match.id, "interested");
      setLiked(true);
      if (result?.mutual) {
        setCanMessage(true);
        onStartChat();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not send that.");
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = () => {
    if (canMessage) {
      onStartChat();
      return;
    }
    Alert.alert(
      "Not matched yet",
      liked
        ? `You have liked ${match.name}. If they like you back, the chat opens for both of you.`
        : `Like ${match.name} first. If they like you back, you can message each other.`,
      liked
        ? [{ text: "OK" }]
        : [
            { text: "Cancel", style: "cancel" },
            { text: "Like", onPress: handleLike },
          ],
    );
  };

  const photos = match.photos?.length
    ? match.photos
    : match.photo
      ? [match.photo]
      : [];

  const hobbies: string[] = Array.isArray(match.hobbies) ? match.hobbies : [];
  const age = String(match.age ?? "").trim();
  const bio = String(match.about ?? "").trim();
  const primaryPhoto = photos[0] ?? match.photo;

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paperBase }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 90,
            paddingHorizontal: 12,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: MAX_WIDTH,
              alignSelf: "center",
              backgroundColor: palette.paper,
              borderRadius: radius.xl,
              paddingHorizontal: SIDE_PADDING,
              paddingVertical: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: 4,
              }}
            >
              <Image
                source={brandLogo}
                style={{ width: 116, height: 32 }}
                resizeMode="contain"
                accessibilityLabel="Apnajoda"
              />
              <TouchableOpacity
                onPress={() => navigate("home")}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={10}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: palette.paperSand,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="arrow-back" size={18} color={palette.ink} />
              </TouchableOpacity>
            </View>

            <View>
              <View style={{ alignItems: "center", marginTop: 4 }}>
                <LinearGradient
                  colors={[palette.crimson, palette.navy]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    width: 116,
                    height: 116,
                    borderRadius: 58,
                    padding: 3,
                  }}
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
                    {primaryPhoto ? (
                      <Image
                        source={{ uri: primaryPhoto }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <View
                        style={{
                          flex: 1,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: palette.paperSand,
                        }}
                      >
                        <Ionicons
                          name="person"
                          size={44}
                          color={palette.navySoft}
                        />
                      </View>
                    )}
                  </View>
                </LinearGradient>
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
                  {match.name}
                  {age ? `, ${age}` : ""}
                </Text>
                {match.verified && <TrustBadge blueTick={match.blueTick} size={22} />}
              </View>

              <Text
                style={{
                  fontSize: 14,
                  color: palette.slate,
                  marginTop: 2,
                  textAlign: "center",
                  fontFamily: fonts.body,
                }}
              >
                {[match.city?.split(",")[0], match.profession]
                  .filter(Boolean)
                  .join("  ·  ") || "City and work not added"}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 16,
                }}
              >
                {hobbies.length > 0 ? (
                  hobbies.map((hobby) => {
                    const icon = hobbyIcon(hobby);
                    return (
                      <View
                        key={hobby}
                        style={{
                          backgroundColor: "transparent",
                          borderWidth: 1,
                          borderColor: palette.rule,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: radius.pill,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {!!icon && (
                          <Ionicons
                            name={icon as any}
                            size={12}
                            color={palette.ink}
                          />
                        )}
                        <Text
                          style={{
                            fontSize: 11,
                            color: palette.ink,
                            fontFamily: fonts.bodySemi,
                          }}
                        >
                          {hobby}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text
                    style={{
                      fontSize: 13,
                      color: palette.slate,
                      fontFamily: fonts.body,
                    }}
                  >
                    No hobbies added
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel={
                    liked ? `You liked ${match.name}` : `Like ${match.name}`
                  }
                  onPress={handleLike}
                  disabled={loading || liked}
                  containerStyle={{ flex: 1 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: liked ? palette.paper : palette.crimson,
                    borderWidth: liked ? 1.5 : 0,
                    borderColor: palette.crimson,
                    paddingVertical: 10,
                    borderRadius: radius.pill,
                    gap: 6,
                    minHeight: 44,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {!liked && <GlowPulse color={palette.crimson} radius={radius.pill} spread={1.12} />}
                  <HeartBeat active={!liked}>
                    <Ionicons
                      name="heart"
                      size={16}
                      color={liked ? palette.crimson : "#FFFFFF"}
                    />
                  </HeartBeat>
                  <Text
                    style={{
                      color: liked ? palette.crimson : "#FFFFFF",
                      fontFamily: fonts.bodySemi,
                      fontSize: 13,
                    }}
                  >
                    {liked ? "Liked" : "Like"}
                  </Text>
                </PressScale>

                <TouchableOpacity
                  onPress={handleMessage}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: canMessage ? palette.navy : palette.paper,
                    borderWidth: canMessage ? 0 : 1.5,
                    borderColor: palette.navy,
                    paddingVertical: 10,
                    borderRadius: radius.pill,
                    gap: 6,
                    minHeight: 44,
                  }}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={16}
                    color={canMessage ? "#FFFFFF" : palette.navy}
                  />
                  <Text
                    style={{
                      color: canMessage ? "#FFFFFF" : palette.navy,
                      fontFamily: fonts.bodySemi,
                      fontSize: 13,
                    }}
                  >
                    Message
                  </Text>
                </TouchableOpacity>
              </View>

              <Reveal delay={80} style={{ marginTop: 24 }}>
                <InfoCard title="About me">
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: fonts.body,
                      color: bio ? palette.inkSoft : palette.slate,
                      lineHeight: 22,
                    }}
                  >
                    {bio || "No bio yet."}
                  </Text>
                </InfoCard>
              </Reveal>

              <Reveal delay={140}>
              <IntentSection
                input={{
                  intent: match.intent,
                  timeline: match.timeline,
                  children: match.children,
                  family: match.family,
                  relocation: match.relocation,
                }}
              />
              </Reveal>

              {photos.length > 0 && (
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
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {photos.map((photo, index) => (
                      <Image
                        key={index}
                        source={{ uri: photo }}
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
                </Text>
                <PostsSection
                  accessToken={accessToken}
                  userId={match.id}
                  isOwner={false}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppCanvas>
  );
}
