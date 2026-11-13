import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { storyApi, type StoryPerson } from "../../api/storyApi";
import { brand } from "../../components/brand";
import { fonts, palette } from "../../theme";
import { Avatar } from "../posts/PostSheets";
import { StoryComposer } from "./StoryComposer";
import { StoryViewer } from "./StoryViewer";
import { liveStories, loadSeen } from "./storySeen";

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
  const [people, setPeople] = useState<StoryPerson[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<number | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [tray, seenNow] = await Promise.all([storyApi.tray(accessToken), loadSeen()]);
      setSeen(seenNow);
      setPeople(
        tray
          .map((person) => ({ ...person, stories: liveStories(person.stories) }))
          .filter((person) => person.stories.length > 0),
      );
    } catch {
      // The tray just stays as it was; posts below still load.
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  if (!accessToken) return null;

  const mine = people.find((person) => person.mine);
  const others = people.filter((person) => !person.mine);
  const unseen = (person: StoryPerson) => person.stories.some((story) => !seen.has(story.id));

  const pick = async () => {
    setError("");
    if (Platform.OS === "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Allow photo access to add a story.");
        return;
      }
    }
    // As picked: no crop, full quality.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) setPicked(result.assets[0].uri);
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 4 }}>
        {/* You: tap to watch yours (or add one if there is none), + always adds. */}
        <View style={{ width: SIZE + 8, alignItems: "center" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mine ? "Watch your story" : "Add to your story"}
            onPress={() => (mine ? setViewing(people.indexOf(mine)) : void pick())}
          >
            <Ring active={!!mine && unseen(mine)} grey={!!mine && !unseen(mine)}>
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
            onPress={() => void pick()}
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
            onPress={() => setViewing(people.indexOf(person))}
            style={{ width: SIZE + 8, alignItems: "center" }}
          >
            <Ring active={unseen(person)} grey={!unseen(person)}>
              <Avatar person={person.user} size={SIZE} />
            </Ring>
            <Text numberOfLines={1} style={{ marginTop: 5, maxWidth: SIZE + 8, fontFamily: fonts.body, fontSize: 12, color: unseen(person) ? palette.ink : palette.slate }}>
              {person.user.username}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {!!error && <Text style={{ color: palette.crimson, fontFamily: fonts.body, fontSize: 12, marginTop: 4 }}>{error}</Text>}

      <StoryViewer
        people={people}
        start={viewing}
        seen={seen}
        accessToken={accessToken}
        onClose={() => setViewing(null)}
        onSeen={(id) => setSeen((current) => (current.has(id) ? current : new Set(current).add(id)))}
        onDeleted={(id) =>
          setPeople((current) =>
            current
              .map((person) => ({ ...person, stories: person.stories.filter((story) => story.id !== id) }))
              .filter((person) => person.stories.length > 0),
          )
        }
      />
      <StoryComposer uri={picked} accessToken={accessToken} onClose={() => setPicked(null)} onShared={() => void load()} />
    </View>
  );
}

/** The ring round a story: brand gradient while new, grey once watched, none with no story. */
function Ring({ active, grey, children }: { active: boolean; grey: boolean; children: ReactNode }) {
  const inner = (
    <View style={{ padding: 2, borderRadius: (SIZE + 4) / 2, backgroundColor: "#FFFFFF" }}>{children}</View>
  );
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
