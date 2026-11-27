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
import { fonts, palette, radius, typeScale } from "../../../theme";

import { AppCanvas } from "../../../components/AppCanvas";
import {
  BottomNav,
  useNavInset,
} from "../../../components/navigation/BottomNav";
import { HobbyRow } from "../../../components/HobbyRow";
import { Linking } from "react-native";
import { useFamilyShare } from "../../../components/FamilyShareButton";
import { PostsSection } from "../components/PostsSection";
import { AddPostButton } from "../components/AddPostButton";
import { shareInvite } from "../components/InviteCard";
import { Sheet } from "../../posts/PostSheets";
import { authApi } from "../../../api/authApi";
import { TrustBadge } from "../../../components/TrustBadge";
import { brand, cardShadow } from "../../../components/brand";
import { ZoomPhoto } from "../../../components/ZoomPhoto";
import { LiquidChip, LiquidPress, Reveal } from "../../../components/motion";
import type { IntentBadgeInput } from "../../../domain/intentBadges";

const MAX_WIDTH = 720;
const SIDE_PADDING = 16;
const brandLogo = require("../../../../assets/apnajoda-logo.png");


export function ProfileScreen({
  profile,
  verified,
  blueTick = false,
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
  const [shareChooser, setShareChooser] = useState(false);

  // Share opens two choices: send the profile to family, or invite friends (earn Boosts).
  const family = useFamilyShare({
    accessToken,
    name: profile?.firstName || "me",
  });
  const inviteFriends = async () => {
    setShareChooser(false);
    if (!accessToken) return;
    try {
      const res: any = await authApi.me(accessToken);
      await shareInvite(String(res?.user?.username ?? ""));
    } catch {
      // Nothing to share if the account could not be read.
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
          // One full-screen background in the app's cream, like every other
          // page; no card behind the content.
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
                    name="settings-outline"
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
                      <ZoomPhoto uri={profilePhoto} label="Your profile photo">
                        <Image
                          source={{ uri: profilePhoto }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      </ZoomPhoto>
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
                  <HobbyRow hobbies={hobbies} />
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
                <LiquidPress
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                  onPress={() => navigate("profileSetup")}
                  colors={[palette.navy, palette.navy]}
                  radius={radius.pill}
                  bulge={1.05}
                  style={{ flex: 1 }}
                  contentStyle={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    gap: 6,
                    minHeight: 44,
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: fonts.bodySemi,
                      fontSize: 14,
                    }}
                  >
                    Edit profile
                  </Text>
                </LiquidPress>
                {family.available && (
                <LiquidChip
                  accessibilityLabel="Share my profile"
                  disabled={family.busy}
                  onPress={() => setShareChooser(true)}
                  containerStyle={{ flex: 1 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    gap: 6,
                    minHeight: 44,
                    backgroundColor: "rgba(255,255,255,0.92)",
                    borderColor: "rgba(75,27,47,0.14)",
                    shadowOpacity: 0.18,
                    shadowRadius: 10,
                  }}
                >
                  <Ionicons name="people" size={16} color={palette.navy} />
                  <Text style={{ color: palette.navy, fontFamily: fonts.bodySemi, fontSize: 14 }}>Share profile</Text>
                </LiquidChip>
                )}
              </View>

              {/* Share profile opens these two choices: share your profile, or invite friends. */}
              <Sheet visible={shareChooser} title="Share" onClose={() => setShareChooser(false)}>
                <View style={{ padding: 14, gap: 10 }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Share your profile"
                    disabled={family.busy}
                    onPress={() => {
                      setShareChooser(false);
                      void family.share();
                    }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, backgroundColor: palette.paperSand }}
                  >
                    <Ionicons name="people-outline" size={22} color={palette.navy} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.ink }}>Share your profile</Text>
                      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>Send it to your family</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Invite friends and earn Boosts"
                    onPress={() => void inviteFriends()}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, backgroundColor: palette.crimsonTint }}
                  >
                    <Ionicons name="gift-outline" size={22} color={palette.crimson} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.ink }}>Invite friends · earn Boosts</Text>
                      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>Boosts come when your friends join</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </Sheet>

              <View style={{ marginTop: 24, paddingHorizontal: 4, gap: 8 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: typeScale.section, color: palette.ink }}>About</Text>
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
                {!!profile?.link && !!profile?.linkTitle && (
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: palette.ink }}>{profile.linkTitle}</Text>
                )}
                {!!profile?.link && (
                  <Text
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(String(profile.link))}
                    style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.navy }}
                  >
                    {String(profile.link).replace(/^https?:\/\//, "")}
                  </Text>
                )}
              </View>

              {/* Premium is this screen's one navy "hero" card. */}
              <Reveal delay={180} style={{ marginTop: 16 }}>
                <LiquidPress
                  accessibilityRole="button"
                  accessibilityLabel="See Premium"
                  onPress={() => navigate("premium")}
                  colors={brand.heroGradient}
                  radius={26}
                  bulge={1.03}
                  style={cardShadow}
                  contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}
                >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: "rgba(255,255,255,0.14)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="sparkles" size={18} color={palette.marigold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.display, fontSize: 17, color: brand.onHero, textShadowColor: "rgba(0,0,0,0.25)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>Premium</Text>
                      <Text style={{ fontSize: 12, color: brand.onHeroSoft, marginTop: 1, fontFamily: fonts.body }}>
                        Unlimited likes, see who liked you, blue tick with Pro
                      </Text>
                    </View>
                    <View style={{ backgroundColor: palette.crimson, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 }}>
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: "#FFFFFF" }}>See plans</Text>
                    </View>
                </LiquidPress>
              </Reveal>

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
