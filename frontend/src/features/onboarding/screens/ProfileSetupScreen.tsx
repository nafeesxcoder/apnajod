import { useEffect, useState, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, Alert, Platform } from "react-native";
import { Modal } from "../../../components/BackModal";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";
import { fonts, palette, radius, typeScale } from "../../../theme";
import { uploadPhoto } from "../../../api/uploadPhoto";
import { authApi } from "../../../api/authApi";
import { profileApi } from "../../../api/profileApi";
import { TrustBadge } from "../../../components/TrustBadge";
import { brand, whiteCard } from "../../../components/brand";
import { PressScale } from "../../../components/motion";
import { DpCropSheet } from "../../profile/components/DpCropSheet";

const BIO_MAX_LENGTH = 500;
const MAX_WIDTH = 720;
const SIDE_PADDING = 16;

export const MASTER_HOBBIES = [
  { label: "Travel", icon: "airplane" },
  { label: "Music", icon: "musical-notes" },
  { label: "Technology", icon: "laptop" },
  { label: "Gaming", icon: "game-controller" },
  { label: "Foodie", icon: "restaurant" },
  { label: "Photography", icon: "camera" },
  { label: "Fitness", icon: "barbell" },
  { label: "Reading", icon: "book" },
  { label: "Movies", icon: "film" },
  { label: "Art", icon: "color-palette" },
  { label: "Dancing", icon: "musical-note" },
  { label: "Cooking", icon: "pizza" },
  { label: "Gardening", icon: "leaf" },
  { label: "Pets", icon: "paw" },
  { label: "Yoga", icon: "body" },
  { label: "Swimming", icon: "water" },
  { label: "Hiking", icon: "trail-sign" },
  { label: "Cycling", icon: "bicycle" },
  { label: "Football", icon: "football" },
  { label: "Cricket", icon: "baseball" },
  { label: "Shopping", icon: "cart" },
  { label: "Fashion", icon: "shirt" },
  { label: "Writing", icon: "create" },
  { label: "Astrology", icon: "star" },
];

export function ProfileSetupScreen({
  accessToken,
  profile: savedProfile,
  photos: savedPhotos,
  onNext,
  verificationStatus = "none",
  verified = false,
  blueTick = false,
  onVerify,
}: {
  accessToken: string;
  profile: any;
  /** @deprecated Changes are handed over only on save, through onNext. */
  onProfileChange?: (p: any) => void;
  photos: string[];
  /** @deprecated Changes are handed over only on save, through onNext. */
  onPhotosChange?: (p: string[]) => void;
  voiceUri: string;
  onVoiceChange: (uri: string) => void;
  allowPreviewContinue: boolean;
  /** Save: the edited profile and photo. Nothing changes before this. */
  onNext: (latest: any, latestPhotos: string[]) => void | Promise<void>;
  /** Selfie verification state, shown as its own row in Edit profile. */
  verificationStatus?: "none" | "pending" | "approved" | "rejected";
  verified?: boolean;
  blueTick?: boolean;
  /** Opens the pose-selfie screen. */
  onVerify?: () => void;
}) {
  // Edits stay on this screen until Save. Leaving without saving (back,
  // another tab) throws them away, so the profile is never half-changed.
  const [profile, setProfile] = useState<any>(savedProfile);
  const [photos, setPhotos] = useState<string[]>(savedPhotos);
  const [account, setAccount] = useState({ username: "", link: "", linkTitle: "" });
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountNote, setAccountNote] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  useEffect(() => {
    if (!accessToken) return;
    void profileApi
      .getMyProfile(accessToken)
      .then((data: any) =>
        setAccount({ username: data?.username ?? "", link: data?.profile?.link ?? "", linkTitle: data?.profile?.link_title ?? "" }),
      )
      .catch(() => undefined);
  }, [accessToken]);
  const saveUsername = async () => {
    setAccountBusy(true);
    setAccountError("");
    try {
      const result: any = await profileApi.changeUsername(accessToken, usernameDraft);
      setAccount((current) => ({ ...current, username: result?.username ?? usernameDraft }));
      setEditingUsername(false);
    } catch (e: any) {
      setAccountError(e?.message || "Could not change your username.");
    } finally {
      setAccountBusy(false);
    }
  };
  const saveLink = async (remove = false) => {
    setAccountBusy(true);
    setAccountError("");
    setAccountNote("");
    try {
      const link = remove ? "" : account.link;
      const title = remove ? "" : account.linkTitle;
      await profileApi.setLink(accessToken, link, title);
      setAccount((current) => ({ ...current, link: remove ? "" : current.link, linkTitle: remove ? "" : current.linkTitle }));
      setAccountNote(remove ? "Link removed." : "Link saved.");
    } catch (e: any) {
      setAccountError(e?.message || "Could not save the link.");
    } finally {
      setAccountBusy(false);
    }
  };
  const onProfileChange = setProfile;
  const onPhotosChange = setPhotos;
  // The photo picked in the browser, waiting for the member to choose
  // which part of it goes in the circle.
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  // The @username is fixed at sign-up; Edit profile shows it, read-only.
  const [username, setUsername] = useState("");
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    authApi
      .me(accessToken)
      .then((res: any) => active && setUsername(String(res?.user?.username ?? "")))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [accessToken]);
  const [bio, setBio] = useState(profile.bio || "");
  const [showHobbyPicker, setShowHobbyPicker] = useState(false);
  const [hobbySearch, setHobbySearch] = useState("");

  const selectedHobbies: string[] = profile.hobbies || [];

  const toggleHobby = (hobby: string) => {
    const updated = selectedHobbies.includes(hobby)
      ? selectedHobbies.filter((h) => h !== hobby)
      : [...selectedHobbies, hobby];
    onProfileChange({ ...profile, hobbies: updated });
  };

  const filteredHobbies = useMemo(() => {
    if (!hobbySearch.trim()) return MASTER_HOBBIES;
    return MASTER_HOBBIES.filter((h) =>
      h.label.toLowerCase().includes(hobbySearch.trim().toLowerCase()),
    );
  }, [hobbySearch]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      // The phone app crops in the phone's own screen; a browser's picker
      // cannot, so the web opens DpCropSheet instead.
      allowsEditing: Platform.OS !== "web",
      aspect: [1, 1],
      quality: Platform.OS === "web" ? 1 : 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (Platform.OS === "web") setCropUri(result.assets[0].uri);
      else await applyPhoto(result.assets[0].uri);
    }
  };

  /** Uploads the chosen (already cropped) photo and shows it here. */
  const applyPhoto = async (uri: string) => {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      // Without a sign-in (preview) there is no server to put it on. Signed
      // in, a failed upload keeps the old photo: a local blob:/file:// link
      // would be saved and nobody else could ever see the picture.
      const uploadedUrl = accessToken ? await uploadPhoto(uri, accessToken) : uri;
      onPhotosChange([uploadedUrl]);
    } catch {
      setPhotoError("Your photo could not be uploaded. Check your internet and try again.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSave = () => {
    // Wait for a new photo to finish uploading, or the old one is saved.
    if (photoBusy) return;
    const trimmedBio = bio.trim();

    if (trimmedBio.length > BIO_MAX_LENGTH) {
      const overBy = trimmedBio.length - BIO_MAX_LENGTH;
      const message = `Bio must be ${BIO_MAX_LENGTH} characters or less.\n\nYou have ${trimmedBio.length} characters. Please remove ${overBy} character${overBy === 1 ? "" : "s"}.`;
      if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert(message);
      } else {
        Alert.alert("Bio too long", message);
      }
      return;
    }

    const latest = { ...profile, bio: trimmedBio };
    onProfileChange(latest);
    onNext(latest, photos);
  };

  const bioLength = bio.length;
  const bioWarning = bioLength >= BIO_MAX_LENGTH;

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paperBase }}>
        {/* Save from the top, as on Instagram: the button at the bottom is easy
            to miss, and leaving the screen before it throws the edits away. */}
        <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, backgroundColor: palette.paperBase }}>
          <View
            style={{
              width: "100%",
              maxWidth: MAX_WIDTH,
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: typeScale.title, color: palette.ink }}>
              Edit profile
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Save profile"
              onPress={handleSave}
              disabled={photoBusy}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(30,27,75,0.14)',
                alignItems: "center",
                justifyContent: "center",
                opacity: photoBusy ? 0.5 : 1,
              }}
            >
              <Ionicons name="checkmark" size={24} color={palette.navy} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 100,
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
              paddingVertical: 20,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodySemi,
                fontSize: typeScale.label,
                color: palette.crimson,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Your Profile
            </Text>
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 28,
                lineHeight: 34,
                color: palette.ink,
                marginBottom: 6,
              }}
            >
              Make it yours
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: fonts.body,
                color: palette.slate,
                marginBottom: 24,
                lineHeight: 21,
              }}
            >
              Add a clear photo and a short bio so people know who you are.
            </Text>

            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <TouchableOpacity
                onPress={pickImage}
                style={{ position: "relative" }}
              >
                {photos[0] ? (
                  <Image
                    source={{ uri: photos[0] }}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      borderWidth: 3,
                      borderColor: palette.crimson,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      backgroundColor: palette.paperSand,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 3,
                      borderColor: palette.crimson,
                    }}
                  >
                    <Ionicons
                      name="camera"
                      size={40}
                      color={palette.navySoft}
                    />
                  </View>
                )}
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    backgroundColor: palette.navy,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: palette.paper,
                  }}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                </View>
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 13,
                  color: palette.slate,
                  marginTop: 12,
                  fontFamily: fonts.body,
                }}
              >
                {photoBusy ? "Uploading photo..." : `Tap to ${photos[0] ? "change" : "add"} your photo`}
              </Text>
              {!!photoError && (
                <Text
                  accessibilityLiveRegion="polite"
                  style={{ fontSize: 13, color: palette.crimson, marginTop: 6, fontFamily: fonts.bodySemi, textAlign: "center" }}
                >
                  {photoError}
                </Text>
              )}
              {!!username && (
                <View
                  accessibilityLabel={`Your username is ${username}${verified ? ", verified" : ""}`}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}
                >
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.navy }}>@{username}</Text>
                  {verified && <TrustBadge blueTick={blueTick} size={18} />}
                </View>
              )}
            </View>

            {/* Selfie verification: its own row, with what it is worth. */}
            {!!onVerify && (
              <View style={{ ...whiteCard, padding: 16, marginBottom: 24, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: verified ? "#E3F2EC" : brand.pillBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={verified ? "shield-checkmark" : verificationStatus === "pending" ? "time" : "shield-outline"}
                    size={22}
                    color={verified ? palette.emerald : palette.crimson}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>
                      Selfie verification
                    </Text>
                    {verified && <TrustBadge blueTick={blueTick} size={16} />}
                  </View>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.slate }}>
                    {verified
                      ? "Verified. People can see you are real."
                      : verificationStatus === "pending"
                        ? "Under review - usually 24-48 hours."
                        : verificationStatus === "rejected"
                          ? "Your last selfie was not approved. Try again with the pose shown."
                          : "A quick pose selfie. Shows you are real and adds +15% to Profile strength."}
                  </Text>
                </View>
                {!verified && verificationStatus !== "pending" && (
                  <PressScale
                    accessibilityRole="button"
                    accessibilityLabel="Verify with a selfie"
                    onPress={onVerify}
                    style={{
                      minHeight: 40,
                      paddingHorizontal: 16,
                      borderRadius: radius.pill,
                      backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(30,27,75,0.14)',
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.navy }}>
                      {verificationStatus === "rejected" ? "Try again" : "Verify"}
                    </Text>
                  </PressScale>
                )}
              </View>
            )}

            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  value={profile.firstName}
                  onChangeText={(v) =>
                    onProfileChange({ ...profile, firstName: v })
                  }
                  placeholder="Enter your first name"
                  style={styles.input}
                  placeholderTextColor={palette.navySoft}
                />
              </View>

              <View style={{ gap: 10 }}>
                <Text style={styles.label}>Username</Text>
                {editingUsername ? (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      value={usernameDraft}
                      onChangeText={setUsernameDraft}
                      placeholder="new username"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                      placeholderTextColor={palette.navySoft}
                    />
                    <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
                      Letters, numbers, dots and underscores. After one change, the next is allowed 15 days later.
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Save username"
                        disabled={accountBusy}
                        onPress={() => void saveUsername()}
                        style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(30,27,75,0.14)' }}
                      >
                        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: palette.navy }}>Save username</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => setEditingUsername(false)}
                        style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.rule }}
                      >
                        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.slate }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>@{account.username || "-"}</Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => {
                        setUsernameDraft("");
                        setAccountError("");
                        setEditingUsername(true);
                      }}
                    >
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.navy }}>Change</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={{ gap: 10 }}>
                <Text style={styles.label}>Link</Text>
                <TextInput
                  value={account.linkTitle}
                  onChangeText={(v) => {
                    setAccountNote("");
                    setAccount((current) => ({ ...current, linkTitle: v }));
                  }}
                  placeholder="Title, e.g. My Instagram"
                  maxLength={60}
                  style={styles.input}
                  placeholderTextColor={palette.navySoft}
                />
                <TextInput
                  value={account.link}
                  onChangeText={(v) => {
                    setAccountNote("");
                    setAccount((current) => ({ ...current, link: v }));
                  }}
                  placeholder="example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.input}
                  placeholderTextColor={palette.navySoft}
                />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={accountBusy}
                    onPress={() => void saveLink(false)}
                    style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.navy }}
                  >
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.navy }}>Save link</Text>
                  </TouchableOpacity>
                  {!!account.link && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Remove link"
                      disabled={accountBusy}
                      onPress={() => void saveLink(true)}
                      style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.crimson }}
                    >
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.crimson }}>Remove link</Text>
                    </TouchableOpacity>
                  )}
                  {!!accountNote && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.emerald }}>{accountNote}</Text>}
                </View>
                {!!accountError && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.crimson }}>{accountError}</Text>}
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Age</Text>
                  <TextInput
                    value={profile.age}
                    onChangeText={(v) =>
                      onProfileChange({ ...profile, age: v })
                    }
                    placeholder="25"
                    keyboardType="numeric"
                    style={styles.input}
                    placeholderTextColor={palette.navySoft}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>I am a</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                    {[
                      { id: "man", label: "He" },
                      { id: "woman", label: "She" },
                      { id: "nonbinary", label: "They" },
                    ].map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() =>
                          onProfileChange({ ...profile, gender: g.id })
                        }
                        style={[
                          styles.chip,
                          profile.gender === g.id && styles.chipActive,
                          { paddingHorizontal: 12 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            profile.gender === g.id && styles.chipTextActive,
                          ]}
                        >
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View>
                <Text style={styles.label}>City</Text>
                <TextInput
                  value={profile.city}
                  onChangeText={(v) => onProfileChange({ ...profile, city: v })}
                  placeholder="e.g. Mumbai, MH"
                  style={styles.input}
                  placeholderTextColor={palette.navySoft}
                />
              </View>

              <View>
                <Text style={styles.label}>What do you do?</Text>
                <TextInput
                  value={profile.profession}
                  onChangeText={(v) =>
                    onProfileChange({ ...profile, profession: v })
                  }
                  placeholder="e.g. Product Designer"
                  style={styles.input}
                  placeholderTextColor={palette.navySoft}
                />
              </View>

              <View>
                <Text style={styles.label}>About Me (Bio)</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="A short bio helps people know the real you..."
                  multiline
                  numberOfLines={4}
                  maxLength={BIO_MAX_LENGTH}
                  style={[
                    styles.input,
                    { height: 100, textAlignVertical: "top", paddingTop: 14 },
                  ]}
                  placeholderTextColor={palette.navySoft}
                />
                <Text
                  style={{
                    fontSize: 11,
                    color: bioWarning ? palette.clay : palette.slate,
                    textAlign: "right",
                    marginTop: 4,
                    fontFamily: fonts.body,
                  }}
                >
                  {bioLength} / {BIO_MAX_LENGTH}
                </Text>
              </View>

              <View>
                <Text style={styles.label}>Hobbies</Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: palette.slate,
                    marginBottom: 8,
                    fontFamily: fonts.body,
                  }}
                >
                  Add hobbies that describe you
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {selectedHobbies.map((hobbyLabel) => {
                    const hobbyData = MASTER_HOBBIES.find(
                      (h) => h.label === hobbyLabel,
                    );
                    return (
                      <View
                        key={hobbyLabel}
                        style={{
                          backgroundColor: palette.paperSand,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: radius.pill,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Ionicons
                          name={(hobbyData?.icon || "heart") as any}
                          size={14}
                          color={palette.navy}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            color: palette.navy,
                            fontFamily: fonts.bodySemi,
                          }}
                        >
                          {hobbyLabel}
                        </Text>
                        <TouchableOpacity
                          onPress={() => toggleHobby(hobbyLabel)}
                        >
                          <Ionicons
                            name="close-circle"
                            size={16}
                            color={palette.navy}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                <TouchableOpacity
                  onPress={() => setShowHobbyPicker(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(30,27,75,0.14)',
                    paddingVertical: 12,
                    borderRadius: radius.pill,
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color={palette.navy} />
                  <Text
                    style={{
                      color: palette.navy,
                      fontFamily: fonts.bodySemi,
                      fontSize: 15,
                    }}
                  >
                    Add Hobbies
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              style={{
                backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(30,27,75,0.14)',
                paddingVertical: 14,
                borderRadius: radius.pill,
                alignItems: "center",
                marginTop: 32,
              }}
            >
              <Text
                style={{
                  color: palette.navy,
                  fontFamily: fonts.bodySemi,
                  fontSize: 15,
                }}
              >
                Save Profile →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={showHobbyPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowHobbyPicker(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(15,20,30,0.5)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                backgroundColor: palette.paper,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                height: "80%",
              }}
            >
              <View
                style={{
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: palette.rule,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 20,
                      color: palette.ink,
                    }}
                  >
                    Select Hobbies
                  </Text>
                  <TouchableOpacity onPress={() => setShowHobbyPicker(false)}>
                    <Ionicons name="close" size={24} color={palette.ink} />
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: palette.paperSand,
                    borderRadius: radius.md,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    gap: 8,
                  }}
                >
                  <Ionicons name="search" size={20} color={palette.slate} />
                  <TextInput
                    value={hobbySearch}
                    onChangeText={setHobbySearch}
                    placeholder="Search hobbies..."
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: palette.ink,
                      fontFamily: fonts.body,
                    }}
                    placeholderTextColor={palette.navySoft}
                  />
                </View>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20 }}>
                {filteredHobbies.length === 0 ? (
                  <Text
                    style={{
                      textAlign: "center",
                      color: palette.slate,
                      marginTop: 20,
                      fontFamily: fonts.body,
                    }}
                  >
                    No hobby found. Try a different search.
                  </Text>
                ) : (
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                  >
                    {filteredHobbies.map((hobby) => {
                      const isSelected = selectedHobbies.includes(hobby.label);
                      return (
                        <TouchableOpacity
                          key={hobby.label}
                          onPress={() => toggleHobby(hobby.label)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: radius.pill,
                            borderWidth: 1.5,
                            borderColor: isSelected
                              ? palette.navy
                              : palette.rule,
                            backgroundColor: isSelected
                              ? palette.paperSand
                              : palette.paper,
                          }}
                        >
                          <Ionicons
                            name={hobby.icon as any}
                            size={16}
                            color={isSelected ? palette.navy : palette.slate}
                          />
                          <Text
                            style={{
                              fontSize: 14,
                              fontFamily: fonts.bodySemi,
                              color: isSelected ? palette.navy : palette.ink,
                            }}
                          >
                            {hobby.label}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color={palette.navy}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              <View
                style={{
                  padding: 20,
                  borderTopWidth: 1,
                  borderTopColor: palette.rule,
                }}
              >
                <TouchableOpacity
                  onPress={() => setShowHobbyPicker(false)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(30,27,75,0.14)',
                    paddingVertical: 14,
                    borderRadius: radius.pill,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: palette.navy,
                      fontFamily: fonts.bodySemi,
                      fontSize: 15,
                    }}
                  >
                    Done ({selectedHobbies.length} selected)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
      <DpCropSheet
        uri={cropUri}
        onCancel={() => setCropUri(null)}
        onDone={(cropped) => {
          setCropUri(null);
          void applyPhoto(cropped);
        }}
      />
    </AppCanvas>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontFamily: fonts.bodySemi,
    color: palette.ink,
    marginBottom: 8,
  },
  input: {
    backgroundColor: palette.paperSand,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.body,
    color: palette.ink,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.rule,
    backgroundColor: palette.paper,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: palette.navy,
    borderColor: palette.navy,
  },
  chipText: {
    fontSize: 13,
    color: palette.ink,
    fontFamily: fonts.bodyMedium,
  },
  chipTextActive: { color: "#FFFFFF" },
});
