import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";
import { colors } from "../../../theme";
import { uploadPhotoOrKeepLocal as uploadPhotoAsset } from "../../../api/uploadPhoto";

const BIO_MAX_LENGTH = 500;

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
  profile,
  onProfileChange,
  photos,
  onPhotosChange,
  onNext,
}: {
  accessToken: string;
  profile: any;
  onProfileChange: (p: any) => void;
  photos: string[];
  onPhotosChange: (p: string[]) => void;
  voiceUri: string;
  onVoiceChange: (uri: string) => void;
  allowPreviewContinue: boolean;
  onNext: (latest?: any) => void;
}) {
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
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uploadedUrl = await uploadPhotoAsset(
        result.assets[0].uri,
        accessToken,
      );
      onPhotosChange([uploadedUrl]);
    }
  };

  const handleSave = () => {
    const trimmedBio = bio.trim().slice(0, BIO_MAX_LENGTH);
    const latest = { ...profile, bio: trimmedBio };
    onProfileChange(latest);
    onNext(latest);
  };

  const bioLength = bio.length;
  const bioWarning = bioLength >= BIO_MAX_LENGTH;

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#EFF0F2" }}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 100 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#8A2237",
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Your Profile
          </Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 8,
            }}
          >
            Make it yours.
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: colors.muted,
              marginBottom: 24,
              lineHeight: 22,
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
                    borderColor: "#8A2237",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: "#D3D6DA",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 3,
                    borderColor: "#8A2237",
                  }}
                >
                  <Ionicons name="camera" size={40} color="#9AA4AF" />
                </View>
              )}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  backgroundColor: "#151719",
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: "#FFF",
                }}
              >
                <Ionicons name="add" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 12 }}>
              Tap to {photos[0] ? "change" : "add"} your photo
            </Text>
          </View>

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
                placeholderTextColor="#9AA4AF"
              />
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  value={profile.age}
                  onChangeText={(v) => onProfileChange({ ...profile, age: v })}
                  placeholder="25"
                  keyboardType="numeric"
                  style={styles.input}
                  placeholderTextColor="#9AA4AF"
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
                        { paddingHorizontal: 16 },
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
                placeholderTextColor="#9AA4AF"
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
                placeholderTextColor="#9AA4AF"
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
                  { height: 100, textAlignVertical: "top" },
                ]}
                placeholderTextColor="#9AA4AF"
              />
              <Text
                style={{
                  fontSize: 11,
                  color: bioWarning ? colors.danger : colors.muted,
                  textAlign: "right",
                  marginTop: 4,
                }}
              >
                {bioLength} / {BIO_MAX_LENGTH}
              </Text>
            </View>

            <View>
              <Text style={styles.label}>Hobbies</Text>
              <Text style={{ fontSize: 12, color: "#5A5E63", marginBottom: 8 }}>
                Add hobbies that describe you (with icons!)
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
                        backgroundColor: "#EFF0F1",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name={(hobbyData?.icon || "heart") as any}
                        size={14}
                        color="#4983BE"
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#4983BE",
                          fontWeight: "600",
                        }}
                      >
                        {hobbyLabel}
                      </Text>
                      <TouchableOpacity onPress={() => toggleHobby(hobbyLabel)}>
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color="#4983BE"
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
                  backgroundColor: "#4983BE",
                  paddingVertical: 12,
                  borderRadius: 12,
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                <Text
                  style={{ color: "#FFF", fontWeight: "700", fontSize: 15 }}
                >
                  Add Hobbies
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            style={{
              backgroundColor: "#151719",
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 32,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
              Save Profile →
            </Text>
          </TouchableOpacity>
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
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                backgroundColor: "#FFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                height: "80%",
              }}
            >
              <View
                style={{
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: "#E6E8EA",
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
                      fontSize: 20,
                      fontWeight: "700",
                      color: "#151719",
                    }}
                  >
                    Select Hobbies
                  </Text>
                  <TouchableOpacity onPress={() => setShowHobbyPicker(false)}>
                    <Ionicons name="close" size={24} color="#151719" />
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#EFF0F2",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    gap: 8,
                  }}
                >
                  <Ionicons name="search" size={20} color="#5A5E63" />
                  <TextInput
                    value={hobbySearch}
                    onChangeText={setHobbySearch}
                    placeholder="Search hobbies..."
                    style={{ flex: 1, fontSize: 15, color: "#151719" }}
                    placeholderTextColor="#9AA4AF"
                  />
                </View>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20 }}>
                {filteredHobbies.length === 0 ? (
                  <Text
                    style={{
                      textAlign: "center",
                      color: "#9AA4AF",
                      marginTop: 20,
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
                            borderRadius: 20,
                            borderWidth: 1.5,
                            borderColor: isSelected ? "#4983BE" : "#D3D6DA",
                            backgroundColor: isSelected ? "#EFF0F1" : "#FFF",
                          }}
                        >
                          <Ionicons
                            name={hobby.icon as any}
                            size={16}
                            color={isSelected ? "#4983BE" : "#5A5E63"}
                          />
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: isSelected ? "#4983BE" : "#151719",
                            }}
                          >
                            {hobby.label}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color="#4983BE"
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
                  borderTopColor: "#E6E8EA",
                }}
              >
                <TouchableOpacity
                  onPress={() => setShowHobbyPicker(false)}
                  style={{
                    backgroundColor: "#4983BE",
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}
                  >
                    Done ({selectedHobbies.length} selected)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </AppCanvas>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D3D6DA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D3D6DA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  chipActive: { backgroundColor: "#151719", borderColor: "#151719" },
  chipText: { fontSize: 13, color: colors.text, fontWeight: "500" },
  chipTextActive: { color: "#FFFFFF" },
});
