import { useState } from "react";
import { ActivityIndicator, Image, Platform, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { NewPostSheet, type PickedPhoto } from "./NewPostSheet";

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
  // The New post sheet: open with the picked photo on the web, or empty in
  // the phone app, where the photo is picked inside it at the chosen size.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);

  const pick = async () => {
    if (!accessToken || busy) return;
    setError(null);
    if (Platform.OS !== "web") {
      setPhotos([]);
      setSheetOpen(true);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Allow photo access to post a picture.");
      return;
    }
    // No editing here: the size and the crop are chosen in the New post sheet.
    // Up to 5 photos make one post you swipe through, like Instagram.
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 1,
    });
    const assets = picked.canceled ? [] : picked.assets.slice(0, 5);
    if (!assets.length) return;
    setBusy(true);
    try {
      const sized: PickedPhoto[] = [];
      for (const asset of assets) {
        const size =
          asset.width && asset.height
            ? { width: asset.width, height: asset.height }
            : await new Promise<{ width: number; height: number }>((resolve, reject) =>
                Image.getSize(asset.uri, (width, height) => resolve({ width, height }), reject),
              );
        sized.push({ uri: asset.uri, ...size });
      }
      setPhotos(sized);
      setSheetOpen(true);
    } catch {
      setError("That photo could not be opened.");
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

      {!!accessToken && (
        <NewPostSheet
          visible={sheetOpen}
          accessToken={accessToken}
          photos={photos}
          onClose={() => {
            setSheetOpen(false);
            setPhotos([]);
          }}
          onPosted={onPosted}
        />
      )}
    </View>
  );
}
