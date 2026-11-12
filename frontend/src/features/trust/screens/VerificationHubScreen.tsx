import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";
import { WebSelfieCamera } from "../components/WebSelfieCamera";
import type { VerificationPose } from "../../../api/profileApi";

export function VerificationHubScreen({
  verified,
  selfieUri,
  verificationStatus,
  onBack,
  onVerify,
  onRequestPose,
}: {
  verified: boolean;
  selfieUri: string;
  verificationStatus?: "none" | "pending" | "approved" | "rejected";
  onBack: () => void;
  onVerify: (uri: string) => Promise<void>;
  /** Fetch a fresh random pose from the server. */
  onRequestPose: () => Promise<VerificationPose>;
}) {
  const isRejected = verificationStatus === "rejected";
  const isPending = verificationStatus === "pending";
  // Anyone still to submit needs a selfie taken with the pose they are about
  // to be given, so an old selfie (or one that was rejected) is never reused.
  const needsSelfie = !verified && !isPending;
  const [pickedUri, setPickedUri] = useState(needsSelfie ? "" : selfieUri);
  const [pose, setPose] = useState<VerificationPose | null>(null);
  const [poseLoading, setPoseLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webCameraOpen, setWebCameraOpen] = useState(false);

  const loadPose = useCallback(async () => {
    setPoseLoading(true);
    try {
      setPose(await onRequestPose());
      // A new pose means the selfie has to be retaken to match it.
      setPickedUri("");
    } catch (err: any) {
      setError(err?.message || "Could not load your pose. Try again.");
    } finally {
      setPoseLoading(false);
    }
  }, [onRequestPose]);

  useEffect(() => {
    if (needsSelfie) void loadPose();
    // Only on arrival: a pose is handed out once per visit unless asked for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takeSelfie = async () => {
    setError(null);
    if (!pose) {
      setError("Wait for your pose to load first.");
      return;
    }
    // In a browser the picker's "camera" is only a file chooser on a laptop,
    // so open the webcam directly for a real live selfie.
    if (Platform.OS === "web") {
      setWebCameraOpen(true);
      return;
    }
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
      const message = err?.message || "Could not submit verification.";
      setError(message);
      // The pose ran out while they were taking the photo: hand out a new
      // one straight away rather than leaving them stuck.
      if (/pose/i.test(message)) void loadPose();
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
            Take a live selfie doing the pose below to get the green Real shield
            next to your name, so matches know you are a real person. Verified
            members with Pro also get the blue tick and show up at the top of
            search.
          </Text>

          {needsSelfie && (
            <View
              accessibilityLabel={
                pose ? `Your pose: ${pose.text}` : "Loading your pose"
              }
              style={{
                backgroundColor: "#EAF5FF",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#0095F6",
                padding: 16,
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              {poseLoading || !pose ? (
                <ActivityIndicator color="#0095F6" />
              ) : (
                <Text style={{ fontSize: 44 }}>{pose.emoji}</Text>
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#0B6BB3",
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  Your pose
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#151719",
                    marginTop: 2,
                  }}
                >
                  {pose ? pose.text : "Getting your pose..."}
                </Text>
                <Text style={{ fontSize: 12, color: "#5A5E63", marginTop: 4 }}>
                  Face clearly visible, pose in the same photo.
                  {pose ? ` Valid for ${pose.validMinutes} minutes.` : ""}
                </Text>
              </View>
              {!!pose && !poseLoading && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Give me a different pose"
                  onPress={() => void loadPose()}
                  hitSlop={8}
                >
                  <Ionicons name="refresh" size={20} color="#0B6BB3" />
                </TouchableOpacity>
              )}
            </View>
          )}

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

            {/* Take Selfie Button - hidden once submitted or verified. */}
            {needsSelfie && (
              <TouchableOpacity
                onPress={takeSelfie}
                disabled={!pose || poseLoading}
                style={{
                  opacity: !pose || poseLoading ? 0.5 : 1,
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
            )}

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
      {Platform.OS === "web" && (
        <WebSelfieCamera
          visible={webCameraOpen}
          onClose={() => setWebCameraOpen(false)}
          onCapture={setPickedUri}
          hint={pose ? `${pose.emoji}  ${pose.text}` : undefined}
        />
      )}
    </AppCanvas>
  );
}
