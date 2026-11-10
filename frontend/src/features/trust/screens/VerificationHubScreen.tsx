import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";

export function VerificationHubScreen({
  verified,
  selfieUri,
  verificationStatus,
  onBack,
  onVerify,
}: {
  verified: boolean;
  selfieUri: string;
  verificationStatus?: "none" | "pending" | "approved" | "rejected";
  onBack: () => void;
  onVerify: (uri: string) => Promise<void>;
}) {
  const isRejected = verificationStatus === "rejected";
  // After a rejection the old selfie is the one that failed review, so start
  // empty and make them take a fresh one before they can resubmit.
  const [pickedUri, setPickedUri] = useState(isRejected ? "" : selfieUri);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takeSelfie = async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Please allow camera access to take a selfie.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front, // Front camera
    });
    if (!result.canceled && result.assets[0]) {
      setPickedUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!pickedUri) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onVerify(pickedUri);
    } catch (err: any) {
      setError(err.message || "Could not submit verification.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ padding: 22, flex: 1 }}>
          {/* Back Button */}
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 24 }}>
            <Ionicons name="arrow-back" size={24} color="#151719" />
          </TouchableOpacity>

          {/* Title Section */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#8A2237",
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Trust & Safety
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#151719",
              marginBottom: 12,
            }}
          >
            Verify your profile
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#5A5E63",
              lineHeight: 22,
              marginBottom: 32,
            }}
          >
            Take a clear selfie to get a verified badge. It builds trust with
            your matches. Just one step.
          </Text>

          {/* Main Card */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 24,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#D3D6DA",
            }}
          >
            {/* Selfie Preview or Placeholder */}
            {pickedUri ? (
              <Image
                source={{ uri: pickedUri }}
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                  marginBottom: 20,
                }}
              />
            ) : (
              <View
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                  backgroundColor: "#F0F2F5",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Ionicons name="person" size={60} color="#9AA4AF" />
              </View>
            )}

            {/* Take Selfie Button */}
            <TouchableOpacity
              onPress={takeSelfie}
              style={{
                backgroundColor: "#FFF",
                borderWidth: 1,
                borderColor: "#151719",
                width: "100%",
                padding: 14,
                borderRadius: 12,
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{ color: "#151719", fontWeight: "600", fontSize: 15 }}
              >
                {pickedUri ? "Retake Selfie" : "Take Selfie"}
              </Text>
            </TouchableOpacity>

            {/* Status / Submit Button */}
            {verified ? (
              <View
                style={{
                  backgroundColor: "#E6F4EE",
                  padding: 12,
                  borderRadius: 8,
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#1F7A5A", fontWeight: "600", fontSize: 14 }}
                >
                  ✅ Your profile is verified
                </Text>
              </View>
            ) : verificationStatus === "pending" ? (
              <View
                style={{
                  backgroundColor: "#FDF3E3",
                  padding: 12,
                  borderRadius: 8,
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#B26A00",
                    fontWeight: "600",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  ⏳ Verification pending. We'll review it shortly.
                </Text>
              </View>
            ) : (
              <>
                {isRejected && (
                  <View
                    style={{
                      backgroundColor: "#FBE9EC",
                      padding: 12,
                      borderRadius: 8,
                      width: "100%",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: "#B3261E",
                        fontWeight: "600",
                        fontSize: 14,
                        textAlign: "center",
                      }}
                    >
                      ❌ Your previous selfie was rejected. Take a new, clear
                      selfie and submit it again.
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!pickedUri || isSubmitting}
                  style={{
                    backgroundColor: pickedUri ? "#151719" : "#C7CED6",
                    width: "100%",
                    padding: 16,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      {isRejected
                        ? "Resubmit for Verification"
                        : "Submit for Verification"}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Error Message */}
            {error ? (
              <Text
                style={{
                  marginTop: 16,
                  color: "#B3261E",
                  textAlign: "center",
                  fontSize: 13,
                }}
              >
                {error}
              </Text>
            ) : null}

            {/* Privacy Note */}
            <Text
              style={{
                marginTop: 20,
                fontSize: 12,
                color: "#888",
                textAlign: "center",
                lineHeight: 18,
              }}
            >
              Your selfie is only used for verification. It is never shown on
              your public profile.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </AppCanvas>
  );
}
