import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import type { StoryPerson } from "../../api/storyApi";
import { brand } from "../../components/brand";
import { fonts, palette } from "../../theme";
import { Avatar } from "../posts/PostSheets";
import { Sheet } from "../posts/PostSheets";
import { StoryEditor, type PickedStoryPhoto } from "./editor/StoryEditor";
import { TEXT_STORY } from "./editor/themes";
import { WebCamera, needsWebCamera } from "./WebCamera";
import { closeUnseen, loadStories, openStoriesAt, useStories } from "./storyStore";
import { CLOSE_GREEN } from "./CloseFriendsSheet";

const SIZE = 64;

/**
 * The round stories along the top of Home: "Your story" first, then
 * everyone you can see with a story up. A coloured ring means there is
 * something you have not watched yet; grey means you have seen it all.
 */
export function StoriesTray({
  accessToken,
  myPhoto,
  myInitial,
  reloadKey = 0,
}: {
  accessToken?: string;
  myPhoto?: string | null;
  myInitial?: string;
  /** Bump to fetch again (pull to refresh). */
  reloadKey?: number;
}) {
  // Who has a story up comes from the shared store (the rings on photos use it too).
  const { people, seen } = useStories();
  const [picked, setPicked] = useState<PickedStoryPhoto | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [webcam, setWebcam] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (accessToken) await loadStories(accessToken);
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  if (!accessToken) return null;

  const mine = people.find((person) => person.mine);
  const others = people.filter((person) => !person.mine);
  const unseen = (person: StoryPerson) => person.stories.some((story) => !seen.has(story.id));

  /** Camera or gallery; the photo opens in the story editor at full quality. */
  const pick = async (from: "camera" | "gallery" | "text") => {
    setChoosing(false);
    setError("");
    // Words on a coloured background, no photo.
    if (from === "text") {
      setPicked({ ...TEXT_STORY });
      return;
    }
    // A laptop's browser cannot take a photo itself: open the webcam here.
    if (from === "camera" && needsWebCamera()) {
      setWebcam(true);
      return;
    }
    try {
      const permission =
        from === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : Platform.OS === "web"
            ? await ImagePicker.requestMediaLibraryPermissionsAsync()
            : { granted: true };
      if (!permission.granted) {
        setError(from === "camera" ? "Allow camera access to take a story." : "Allow photo access to add a story.");
        return;
      }
      // As picked: no crop, full quality.
      const options = { mediaTypes: ["images"] as ImagePicker.MediaType[], allowsEditing: false, quality: 1 };
      const result = from === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      const size =
        asset.width && asset.height
          ? { width: asset.width, height: asset.height }
          : await new Promise<{ width: number; height: number }>((resolve, reject) =>
              Image.getSize(asset.uri, (width, height) => resolve({ width, height }), reject),
            );
      setPicked({ uri: asset.uri, ...size });
    } catch {
      setError("That photo could not be opened.");
    }
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 4 }}>
        {/* You: tap to watch yours (or add one if there is none), + always adds. */}
        <View style={{ width: SIZE + 8, alignItems: "center" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mine ? "Watch your story" : "Add to your story"}
            onPress={() => (mine ? openStoriesAt(people.indexOf(mine)) : setChoosing(true))}
          >
            <Ring active={!!mine && unseen(mine)} grey={!!mine && !unseen(mine)} close={!!mine && closeUnseen(people, seen, mine.user.userId)}>
              {myPhoto ? (
                <Image source={{ uri: myPhoto }} style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: palette.paperSand }} />
              ) : (
                <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: palette.crimsonTint, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 24, color: palette.crimson }}>{myInitial || "?"}</Text>
                </View>
              )}
            </Ring>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add to your story"
            onPress={() => setChoosing(true)}
            hitSlop={6}
            style={{
              position: "absolute",
              top: SIZE - 18,
              right: 0,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: palette.crimson,
              borderWidth: 2,
              borderColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </Pressable>
          <Text numberOfLines={1} style={{ marginTop: 5, fontFamily: fonts.body, fontSize: 12, color: palette.ink }}>
            Your story
          </Text>
        </View>

        {others.map((person) => (
          <Pressable
            key={person.user.userId}
            accessibilityRole="button"
            accessibilityLabel={`${person.user.username}'s story${unseen(person) ? ", new" : ""}`}
            onPress={() => openStoriesAt(people.indexOf(person))}
            style={{ width: SIZE + 8, alignItems: "center" }}
          >
            <Ring active={unseen(person)} grey={!unseen(person)} close={closeUnseen(people, seen, person.user.userId)}>
              <Avatar person={person.user} size={SIZE} />
            </Ring>
            <Text numberOfLines={1} style={{ marginTop: 5, maxWidth: SIZE + 8, fontFamily: fonts.body, fontSize: 12, color: unseen(person) ? palette.ink : palette.slate }}>
              {person.user.username}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {!!error && <Text style={{ color: palette.crimson, fontFamily: fonts.body, fontSize: 12, marginTop: 4 }}>{error}</Text>}

      <WebCamera
        visible={webcam}
        onClose={() => setWebcam(false)}
        onCapture={(photo) => {
          setWebcam(false);
          setPicked(photo);
        }}
        onGallery={() => {
          setWebcam(false);
          setTimeout(() => void pick("gallery"), 50);
        }}
      />
      <StoryEditor photo={picked} accessToken={accessToken} onClose={() => setPicked(null)} onShared={() => void load()} />
      <Sheet visible={choosing} title="Add to your story" onClose={() => setChoosing(false)}>
        <View style={{ paddingVertical: 6 }}>
          {(
            [
              ["camera", "camera-outline", "Take a photo"],
              ["gallery", "images-outline", "Choose from gallery"],
              ["text", "text", "Create with text"],
            ] as const
          ).map(([from, icon, label]) => (
            <Pressable
              key={from}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => void pick(from)}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, minHeight: 56 }}
            >
              <Ionicons name={icon} size={24} color={palette.ink} />
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

/** The ring round a story: brand gradient while new, grey once watched, none with no story. */
function Ring({ active, grey, close = false, children }: { active: boolean; grey: boolean; close?: boolean; children: ReactNode }) {
  const inner = (
    <View style={{ padding: 2, borderRadius: (SIZE + 4) / 2, backgroundColor: "#FFFFFF" }}>{children}</View>
  );
  // A Close friends story not yet watched: green.
  if (active && close) {
    return <View style={{ padding: 2.5, borderRadius: (SIZE + 9) / 2, backgroundColor: CLOSE_GREEN }}>{inner}</View>;
  }
  if (active) {
    return (
      <LinearGradient
        colors={[brand.barGradient[1], brand.barGradient[0]]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={{ padding: 2.5, borderRadius: (SIZE + 9) / 2 }}
      >
        {inner}
      </LinearGradient>
    );
  }
  return (
    <View style={{ padding: 2.5, borderRadius: (SIZE + 9) / 2, backgroundColor: grey ? palette.rule : "transparent" }}>{inner}</View>
  );
}
