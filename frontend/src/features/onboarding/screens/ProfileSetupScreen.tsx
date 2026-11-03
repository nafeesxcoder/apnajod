import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";
import { colors } from "../../../theme";

// Server par photo upload karne ka function
async function uploadPhotoAsset(
  uri: string,
  accessToken?: string,
): Promise<string> {
  if (!accessToken) return uri;
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
    const formData = new FormData();
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append("photo", blob, "photo.jpg");
    const uploadResponse = await fetch(`${API_URL}/profile/upload-photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });
    const data = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(data.error || "Upload failed");
    return data.url; // Server ka URL return karega
  } catch (e) {
    console.log("Photo upload failed, using local URI", e);
    return uri; // Agar fail ho toh local URI hi rakh lo
  }
}

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
  onNext: () => void;
}) {
  const [bio, setBio] = useState(profile.bio || "");

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
      // Photo ko server par upload karo, phir URL save karo
      const uploadedUrl = await uploadPhotoAsset(
        result.assets[0].uri,
        accessToken,
      );
      onPhotosChange([uploadedUrl]);
    }
  };

  const handleSave = () => {
    onProfileChange({ ...profile, bio });
    onNext();
  };

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F3E9" }}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 100 }}>
          {/* Header */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#8A6722",
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

          {/* Profile Photo (Sirf Ek) */}
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
                    borderColor: "#8A6722",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: "#E2D9CB",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 3,
                    borderColor: "#8A6722",
                  }}
                >
                  <Ionicons name="camera" size={40} color="#A0A0A0" />
                </View>
              )}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  backgroundColor: "#1A1416",
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

          {/* Form Fields */}
          <View style={{ gap: 16 }}>
            {/* Name */}
            <View>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                value={profile.firstName}
                onChangeText={(v) =>
                  onProfileChange({ ...profile, firstName: v })
                }
                placeholder="Enter your first name"
                style={styles.input}
                placeholderTextColor="#A0A0A0"
              />
            </View>

            {/* Age & Gender Row */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  value={profile.age}
                  onChangeText={(v) => onProfileChange({ ...profile, age: v })}
                  placeholder="25"
                  keyboardType="numeric"
                  style={styles.input}
                  placeholderTextColor="#A0A0A0"
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

            {/* City */}
            <View>
              <Text style={styles.label}>City</Text>
              <TextInput
                value={profile.city}
                onChangeText={(v) => onProfileChange({ ...profile, city: v })}
                placeholder="e.g. Mumbai, MH"
                style={styles.input}
                placeholderTextColor="#A0A0A0"
              />
            </View>

            {/* Profession */}
            <View>
              <Text style={styles.label}>What do you do?</Text>
              <TextInput
                value={profile.profession}
                onChangeText={(v) =>
                  onProfileChange({ ...profile, profession: v })
                }
                placeholder="e.g. Product Designer"
                style={styles.input}
                placeholderTextColor="#A0A0A0"
              />
            </View>

            {/* Bio */}
            <View>
              <Text style={styles.label}>About Me (Bio)</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="A short bio helps people know the real you..."
                multiline
                numberOfLines={4}
                style={[
                  styles.input,
                  { height: 100, textAlignVertical: "top" },
                ]}
                placeholderTextColor="#A0A0A0"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            style={{
              backgroundColor: "#1A1416",
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
    borderColor: "#E2D9CB",
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
    borderColor: "#E2D9CB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: "#1A1416",
    borderColor: "#1A1416",
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
});
