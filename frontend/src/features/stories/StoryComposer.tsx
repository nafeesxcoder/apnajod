import { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { storyApi } from "../../api/storyApi";
import { fonts, palette, radius } from "../../theme";
import { useVisibleHeight } from "../posts/PostSheets";

/**
 * The photo you picked, full screen, and "Share to your story". The photo
 * goes up exactly as it was picked - no crop, no shrinking.
 */
export function StoryComposer({
  uri,
  accessToken,
  onClose,
  onShared,
}: {
  uri: string | null;
  accessToken: string;
  onClose: () => void;
  onShared: () => void;
}) {
  const height = useVisibleHeight();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const share = async () => {
    if (!uri || busy) return;
    setBusy(true);
    setError("");
    try {
      await storyApi.create(accessToken, uri);
      onShared();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Your story could not be shared.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={!!uri} animationType="fade" onRequestClose={() => !busy && onClose()}>
      <View style={{ height, backgroundColor: "#000", justifyContent: "center" }}>
        {!!uri && <Image source={{ uri }} resizeMode="contain" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel story"
          onPress={onClose}
          disabled={busy}
          style={{
            position: "absolute",
            top: 14,
            left: 12,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </Pressable>

        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 26, gap: 10 }}>
          {!!error && (
            <Text style={{ alignSelf: "center", color: "#FFFFFF", backgroundColor: "rgba(179,38,30,0.9)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, fontFamily: fonts.body, fontSize: 13 }}>
              {error}
            </Text>
          )}
          <Text style={{ alignSelf: "center", color: "rgba(255,255,255,0.8)", fontFamily: fonts.body, fontSize: 12 }}>
            Disappears after 24 hours
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share to your story"
            onPress={() => void share()}
            disabled={busy}
            style={{
              alignSelf: "center",
              minHeight: 48,
              paddingHorizontal: 26,
              borderRadius: radius.pill,
              backgroundColor: palette.crimson,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              opacity: busy ? 0.75 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            )}
            <Text style={{ color: "#FFFFFF", fontFamily: fonts.bodyBold, fontSize: 15 }}>
              {busy ? "Sharing..." : "Share to your story"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
