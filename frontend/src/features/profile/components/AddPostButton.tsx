import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { postApi } from "../../../api/postApi";
import { uploadPhoto } from "../../../api/uploadPhoto";
import { CaptionEditor } from "./CaptionEditor";

const DANGER = "#B3261E";

/**
 * The + that adds a post, wherever it is put.
 *
 * One component rather than the picker, the upload and the caption box
 * written out on each screen that offers posting: two copies would be two
 * behaviours the first time either is changed.
 */
export function AddPostButton({
  accessToken,
  onPosted,
  size = 36,
  iconSize = 24,
  color = "#151719",
  background = "rgba(255,255,255,0.9)",
}: {
  accessToken?: string;
  /** Called once the post exists, so a list on the same screen can reload. */
  onPosted?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  const pick = async () => {
    if (!accessToken || busy) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Allow photo access to post a picture.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]) return;

    setBusy(true);
    setError(null);
    try {
      // Uploaded first: the server stores a URL, never the device path.
      const url = await uploadPhoto(picked.assets[0].uri, accessToken);
      const created = await postApi.create(accessToken, url, "");
      onPosted?.();
      // Straight into the caption, which is the point of posting it.
      setPostId(created.post?.id ?? null);
      setCaption("");
    } catch (err: any) {
      setError(err.message || "Could not post that photo.");
    } finally {
      setBusy(false);
    }
  };

  const saveCaption = async () => {
    if (!accessToken || !postId) return;
    setBusy(true);
    try {
      await postApi.updateCaption(accessToken, postId, caption);
      setPostId(null);
      onPosted?.();
    } catch (err: any) {
      setError(err.message || "Could not save that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Add a post"
        onPress={pick}
        disabled={busy}
        hitSlop={8}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
          justifyContent: "center",
          alignItems: "center",
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Ionicons name="add" size={iconSize} color={color} />
        )}
      </TouchableOpacity>

      {!!error && (
        <Text
          style={{
            position: "absolute",
            top: size + 4,
            right: 0,
            width: 200,
            textAlign: "right",
            color: DANGER,
            fontSize: 11,
          }}
        >
          {error}
        </Text>
      )}

      <CaptionEditor
        visible={!!postId}
        value={caption}
        busy={busy}
        onChange={setCaption}
        onCancel={() => setPostId(null)}
        onSave={saveCaption}
      />
    </View>
  );
}
