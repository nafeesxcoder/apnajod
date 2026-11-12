import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
} from "react-native";
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
import { TrustBadge } from "../../../components/TrustBadge";
import { IntentBadges } from "../../../components/IntentBadges";
import { FamilyShareButton } from "../../../components/FamilyShareButton";
import type { IntentBadgeInput } from "../../../domain/intentBadges";
import { authApi } from "../../../api/authApi";

const MAX_WIDTH = 720;
const SIDE_PADDING = 16;
const brandLogo = require("../../../../assets/apnajoda-logo.png");

// Invite links point at the public site. ?invite=<username> is read by
// captureInviteFromUrl, so a signup that comes from this link credits you.
const SHARE_BASE = "https://apnajoda.com/";
const SHARE_TEXT =
  "Join me on Apnajoda. Meaningful connections, meaningful futures.";

function hobbyIcon(label: string) {
  const wanted = String(label).trim().toLowerCase();
  return MASTER_HOBBIES.find((h) => h.label.toLowerCase() === wanted)?.icon;
}

export function ProfileScreen({
  profile,
  verified,
  blueTick = false,
  intentInput,
  profilePhoto,
  navigate,
  accessToken,
}: {
  profile: any;
  verified: boolean;
  /** Approved selfie AND Pro. */
  blueTick?: boolean;
  /** Their own intent and alignment answers, shown as badges. */
  intentInput?: IntentBadgeInput;
  profilePhoto?: string;
  navigate: (screen: any) => void;
  accessToken?: string;
}) {
  const navInset = useNavInset();
  const [postsReloadKey, setPostsReloadKey] = useState(0);
  const [username, setUsername] = useState("");
  const [shareNote, setShareNote] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    authApi
      .me(accessToken)
      .then((res: any) => {
        if (active) setUsername(String(res?.user?.username ?? ""));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!shareNote) return;
    const timer = setTimeout(() => setShareNote(""), 4000);
    return () => clearTimeout(timer);
  }, [shareNote]);

  const shareLink = username
    ? `${SHARE_BASE}?invite=${encodeURIComponent(username)}`
    : SHARE_BASE;

  const onShareProfile = async () => {
    try {
      if (Platform.OS === "web") {
        const nav: any = typeof navigator !== "undefined" ? navigator : null;
        if (nav?.share) {
          await nav.share({ title: "Apnajoda", text: SHARE_TEXT, url: shareLink });
          return;
        }
        if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(`${SHARE_TEXT} ${shareLink}`);
          setShareNote("Link copied. Paste it in WhatsApp, Instagram or Facebook.");
          return;
        }
        setShareNote(shareLink);
        return;
      }
      await Share.share({ message: `${SHARE_TEXT} ${shareLink}` });
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      setShareNote("Could not share. Please try again.");
    }
  };

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
                  {name ? (age ? `${name}, ${age}` : name) : "Your profile"}
                </Text>
                {verified && <TrustBadge blueTick={blueTick} size={22} />}
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
                {[profile?.city, profile?.profession]
                  .filter(Boolean)
                  .join("  ·  ") || "Add your city and work"}
              </Text>

              {!!intentInput && <IntentBadges center input={intentInput} />}

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
                  accessibilityRole="button"
                  accessibilityLabel="Share profile"
                  onPress={() => void onShareProfile()}
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

              <FamilyShareButton
                accessToken={accessToken}
                name={profile?.firstName || "me"}
                label="Send my profile to family"
              />

              {!!shareNote && (
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    color: palette.slate,
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  {shareNote}
                </Text>
              )}

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
