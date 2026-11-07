import { useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { fonts, palette, radius, typeScale } from "../../../theme";

import { AppCanvas } from "../../../components/AppCanvas";
import {
  BottomNav,
  useNavInset,
} from "../../../components/navigation/BottomNav";
import { MASTER_HOBBIES } from "../../onboarding/screens/ProfileSetupScreen";
import { PostsSection } from "../components/PostsSection";
import { AddPostButton } from "../components/AddPostButton";

const MAX_WIDTH = 720;
const SIDE_PADDING = 16;
const brandLogo = require("../../../../assets/apnajoda-logo.png");

function hobbyIcon(label: string) {
  const wanted = String(label).trim().toLowerCase();
  return MASTER_HOBBIES.find((h) => h.label.toLowerCase() === wanted)?.icon;
}

export function ProfileScreen({
  profile,
  verified: _verified,
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
  const [postsReloadKey, setPostsReloadKey] = useState(0);

  const hobbies: string[] = Array.isArray(profile?.hobbies)
    ? profile.hobbies
    : [];
  const name = String(profile?.firstName ?? "").trim();
  const age = String(profile?.age ?? "").trim();
  const bio = String(profile?.bio ?? "").trim();

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
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <AddPostButton
                  accessToken={accessToken}
                  onPosted={() => setPostsReloadKey((key) => key + 1)}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  onPress={() => navigate("settings")}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: palette.paperSand,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={18}
                    color={palette.ink}
                  />
                </TouchableOpacity>
              </View>
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

              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 28,
                  lineHeight: 34,
                  color: palette.ink,
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                {name ? (age ? `${name}, ${age}` : name) : "Your profile"}
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  color: palette.slate,
                  marginTop: 2,
                  textAlign: "center",
                  fontFamily: fonts.body,
                }}
              >
                {[profile?.city, profile?.profession]
                  .filter(Boolean)
                  .join("  ·  ") || "Add your city and work"}
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
                  <TouchableOpacity onPress={() => navigate("profileSetup")}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: palette.navy,
                        fontFamily: fonts.bodySemi,
                      }}
                    >
                      Add hobbies
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
                <TouchableOpacity
                  onPress={() => navigate("profileSetup")}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: palette.navy,
                    paddingVertical: 10,
                    borderRadius: radius.pill,
                    gap: 6,
                    minHeight: 44,
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: fonts.bodySemi,
                      fontSize: 13,
                    }}
                  >
                    Edit profile
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: palette.paper,
                    borderWidth: 1.5,
                    borderColor: palette.navy,
                    paddingVertical: 10,
                    borderRadius: radius.pill,
                    gap: 6,
                    minHeight: 44,
                  }}
                >
                  <Ionicons
                    name="share-social"
                    size={16}
                    color={palette.navy}
                  />
                  <Text
                    style={{
                      color: palette.navy,
                      fontFamily: fonts.bodySemi,
                      fontSize: 13,
                    }}
                  >
                    Share profile
                  </Text>
                </TouchableOpacity>
              </View>

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
                    fontSize: 15,
                    fontFamily: fonts.body,
                    color: bio ? palette.inkSoft : palette.slate,
                    lineHeight: 22,
                  }}
                >
                  {bio || "Add a short bio so people know the real you."}
                </Text>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="See Premium"
                onPress={() => navigate("premium")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: palette.paperSand,
                  borderRadius: radius.md,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginTop: 24,
                }}
              >
                <Ionicons name="sparkles" size={18} color={palette.navy} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 15,
                      color: palette.ink,
                    }}
                  >
                    Premium
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: palette.slate,
                      marginTop: 1,
                      fontFamily: fonts.body,
                    }}
                  >
                    Unlimited likes, see who liked you
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={palette.slate}
                />
              </TouchableOpacity>

              <View style={{ marginTop: 24 }}>
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: typeScale.section,
                    color: palette.ink,
                    marginBottom: 12,
                  }}
                >
                  My posts
                </Text>

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
