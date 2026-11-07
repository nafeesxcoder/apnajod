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
import { LinearGradient } from "expo-linear-gradient";
import { fonts, palette } from "../../../theme";

import { AppCanvas } from "../../../components/AppCanvas";
import { BottomNav, useNavInset } from "../../../components/navigation/BottomNav";
import { MASTER_HOBBIES } from "../../onboarding/screens/ProfileSetupScreen";
import { PostsSection } from "../components/PostsSection";
import { AddPostButton } from "../components/AddPostButton";

const PINK = palette.navy;
const PINK_LIGHT = palette.paperSand;
const DARK = palette.ink;
const MUTED = palette.slate;
const WHITE = "#FFFFFF";

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
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paperBase, paddingLeft: navInset.paddingLeft }}>
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
              {/* The one bold thing on this screen.
                  Everything here used to be the same left-aligned list of
                  rows as the settings page. A profile is a portrait, so it
                  is centred and the photo is given a ring that echoes the
                  arc in the mark - crimson into navy. Nothing else on the
                  screen competes with it. */}
              <View style={{ alignItems: "center", marginTop: 10 }}>
                <View style={{ position: "relative" }}>
                  <LinearGradient
                    colors={[palette.crimson, palette.navy]}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      width: 144,
                      height: 144,
                      borderRadius: 72,
                      padding: 4,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 68,
                        borderWidth: 4,
                        borderColor: palette.paperBase,
                        overflow: "hidden",
                        backgroundColor: palette.paper,
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
                            flex: 1,
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: palette.paperSand,
                          }}
                        >
                          <Ionicons name="person" size={54} color={palette.navySoft} />
                        </View>
                      )}
                    </View>
                  </LinearGradient>

                  {verified && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 2,
                        right: 2,
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: palette.marigold,
                        borderWidth: 3,
                        borderColor: palette.paperBase,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </View>

                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 32,
                    lineHeight: 40,
                    color: palette.ink,
                    marginTop: 18,
                    textAlign: "center",
                  }}
                >
                  {name ? (age ? `${name}, ${age}` : name) : "Your profile"}
                </Text>

                <Text
                  style={{
                    fontSize: 15,
                    color: palette.slate,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  {[profile?.city, profile?.profession].filter(Boolean).join("  ·  ") ||
                    "Add your city and work"}
                </Text>
              </View>

              {/* Hobbies */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 8,
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
                  borderColor: palette.rule,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 16,
                }}
              >
                <Ionicons name="sparkles" size={20} color="#1F4D7A" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 18, color: palette.ink }}>
                    Premium
                  </Text>
                  <Text style={{ fontSize: 13, color: "#5A6878" }}>
                    Unlimited likes, see who liked you, and more
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8A96A4" />
              </TouchableOpacity>

              {/* Not a card.
                  Everything on this page was the same white rounded box
                  with a hairline, which is what made it read as a form.
                  Somebody's own words about themselves belong on the page,
                  with a rule and some air for separation and nothing
                  boxing them in. */}
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
                    fontSize: 19,
                    color: DARK,
                    marginBottom: 8,
                  }}
                >
                  About
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: bio ? palette.inkSoft : MUTED,
                    lineHeight: 24,
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
                      style={{ fontFamily: fonts.display, fontSize: 19, color: DARK }}
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
