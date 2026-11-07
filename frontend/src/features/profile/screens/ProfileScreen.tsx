import { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";
import { BottomNav, useNavInset } from "../../../components/navigation/BottomNav";
import { MASTER_HOBBIES } from "../../onboarding/screens/ProfileSetupScreen";
import { PostsSection } from "../components/PostsSection";
import { AddPostButton } from "../components/AddPostButton";

const PINK = "#4983BE";
const PINK_LIGHT = "#EFF0F1";
const DARK = "#151719";
const MUTED = "#5A5E63";
const WHITE = "#FFFFFF";
const LINE = "#E6E8EA";

const MAX_WIDTH = 720;

const brandLogo = require("../../../../assets/apnajoda-logo.png");
const SIDE_PADDING = 16;


function hobbyIcon(label: string) {
  const wanted = String(label).trim().toLowerCase();
  return MASTER_HOBBIES.find((h) => h.label.toLowerCase() === wanted)?.icon;
}

export function ProfileScreen({
  profile,
  verified,
  profilePhoto,
  navigate,
  accessToken,
}: {
  profile: any;
  verified: boolean;
  profilePhoto?: string;
  navigate: (screen: any) => void;
  accessToken?: string;
}) {
  const navInset = useNavInset();
  // Bumped after posting from the cover, so the list below reloads.
  const [postsReloadKey, setPostsReloadKey] = useState(0);
  const hobbies: string[] = Array.isArray(profile?.hobbies)
    ? profile.hobbies
    : [];
  const name = String(profile?.firstName ?? "").trim();
  const age = String(profile?.age ?? "").trim();
  const bio = String(profile?.bio ?? "").trim();
  // const initial = name ? name.charAt(0).toUpperCase() : "";

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA", paddingLeft: navInset.paddingLeft }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 90 }}
        >
          <View
            style={{ width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center" }}
          >
            {/* A plain header bar: the logo, and the two things you do
                from here. The cover used to be the member's own first
                photo, blurred, behind a gradient - 160px of their own face
                out of focus, which told them nothing and pushed the whole
                profile below the fold. */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: SIDE_PADDING,
                paddingTop: 10,
                paddingBottom: 6,
              }}
            >
              <Image
                source={brandLogo}
                style={{ width: 132, height: 38 }}
                resizeMode="contain"
                accessibilityLabel="Apnajoda"
              />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <AddPostButton
                  accessToken={accessToken}
                  onPosted={() => setPostsReloadKey((key) => key + 1)}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  onPress={() => navigate("settings")}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(255,255,255,0.9)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="ellipsis-vertical" size={22} color={DARK} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ paddingHorizontal: SIDE_PADDING }}>
              {/* Profile Photo + Verified */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginTop: 6,
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
                    {profilePhoto ? (
                      <Image
                        source={{ uri: profilePhoto }}
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
                  {verified && (
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
                  )}
                </View>

                {verified && (
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
                )}
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
                  {name ? (age ? `${name}, ${age}` : name) : "Your profile"}
                </Text>
                {verified && (
                  <Ionicons name="checkmark-circle" size={24} color={PINK} />
                )}
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
                    {profile?.city || "Bareilly"}
                  </Text>
                </View>
                <Text style={{ color: MUTED }}>|</Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Ionicons name="briefcase" size={16} color={MUTED} />
                  <Text style={{ fontSize: 14, color: MUTED }}>
                    {profile?.profession || "Software Engineer"}
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
                  <TouchableOpacity onPress={() => navigate("profileSetup")}>
                    <Text
                      style={{ fontSize: 14, color: PINK, fontWeight: "600" }}
                    >
                      Add hobbies
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Edit Profile & Share Buttons */}
              <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  onPress={() => navigate("profileSetup")}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: PINK,
                    paddingVertical: 14,
                    borderRadius: 30,
                    gap: 8,
                  }}
                >
                  <Ionicons name="create-outline" size={20} color={WHITE} />
                  <Text
                    style={{ color: WHITE, fontWeight: "700", fontSize: 16 }}
                  >
                    Edit Profile
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: WHITE,
                    borderWidth: 2,
                    borderColor: PINK,
                    paddingVertical: 14,
                    borderRadius: 30,
                    gap: 8,
                  }}
                >
                  <Ionicons name="share-social" size={20} color={PINK} />
                  <Text
                    style={{ color: PINK, fontWeight: "700", fontSize: 16 }}
                  >
                    Share Profile
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Premium. A row rather than a banner: it is there when
                  somebody goes looking, and it does not shout at a member
                  who has not asked. */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="See Premium"
                onPress={() => navigate("premium")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#DDE3EA",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 16,
                }}
              >
                <Ionicons name="sparkles" size={20} color="#1F4D7A" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#14202E" }}>
                    Premium
                  </Text>
                  <Text style={{ fontSize: 13, color: "#5A6878" }}>
                    Unlimited likes, see who liked you, and more
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8A96A4" />
              </TouchableOpacity>

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
                    color: bio ? MUTED : "#9AA4AF",
                    lineHeight: 22,
                  }}
                >
                  {bio || "Add a short bio so people know the real you."}
                </Text>
              </View>

              {/* Posts */}
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
                      My Posts
                    </Text>
                  </View>
                </View>

                <PostsSection
                  accessToken={accessToken}
                  isOwner
                  reloadKey={postsReloadKey}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <BottomNav active="profile" navigate={navigate} />
      </SafeAreaView>
    </AppCanvas>
  );
}
