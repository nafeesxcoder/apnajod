import { useState } from "react";
import { ActivityIndicator, Image, Platform, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { NewPostSheet, type PickedPhoto } from "./NewPostSheet";
import { Sheet } from "../../posts/PostSheets";
import { openStoryChooser } from "../../stories/storyStore";
import { fonts, palette } from "../../../theme";

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
  withStory = false,
}: {
  accessToken?: string;
  /** Called once the post exists, so a list on the same screen can reload. */
  onPosted?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
  /** On Home: the + asks Story or Post first, like Instagram. */
  withStory?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
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
        accessibilityLabel={withStory ? "Create a story or post" : "Add a post"}
        onPress={withStory ? () => setMenuOpen(true) : pick}
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

      {withStory && (
        <Sheet visible={menuOpen} title="Create" onClose={() => setMenuOpen(false)}>
          <View style={{ paddingVertical: 6 }}>
            {(
              [
                ["story", "add-circle-outline", "Story", "A photo or text for 24 hours"],
                ["post", "grid-outline", "Post", "Photos on your profile and in the feed"],
              ] as const
            ).map(([kind, icon, label, hint]) => (
              <TouchableOpacity
                key={kind}
                accessibilityRole="button"
                accessibilityLabel={`Create a ${label.toLowerCase()}`}
                onPress={() => {
                  setMenuOpen(false);
                  if (kind === "story") setTimeout(openStoryChooser, 250);
                  else void pick();
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, minHeight: 62 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: palette.crimsonTint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={icon} size={22} color={palette.crimson} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>{label}</Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate, marginTop: 1 }}>{hint}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.slate} />
              </TouchableOpacity>
            ))}
          </View>
        </Sheet>
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
