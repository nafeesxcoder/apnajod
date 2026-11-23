import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { postApi, type DeletedPost } from "../../../api/postApi";
import { storyApi, type ArchivedStory } from "../../../api/storyApi";
import { serverMs } from "../../../domain/serverTime";
import { colors, fonts, palette, radius, typeScale } from "../../../theme";

const DAY_MS = 24 * 60 * 60 * 1000;
const KEEP_DAYS = 30;

/** "3 days left" from when something was deleted or archived. */
function daysLeft(iso: string | null | undefined): string {
  const at = serverMs(iso ?? "");
  if (Number.isNaN(at)) return "";
  const left = Math.max(0, KEEP_DAYS - Math.floor((Date.now() - at) / DAY_MS));
  return left === 0 ? "Removed today" : `${left} ${left === 1 ? "day" : "days"} left`;
}

function Row({
  icon,
  label,
  onPress,
  open,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  open?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: palette.ruleSoft,
      }}
    >
      <Ionicons name={icon} size={22} color={palette.ink} />
      <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: typeScale.body, color: palette.ink }}>{label}</Text>
      <Ionicons
        name={open === undefined ? "chevron-forward" : open ? "chevron-up" : "chevron-down"}
        size={18}
        color={palette.slate}
      />
    </Pressable>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: fonts.bodySemi,
        fontSize: typeScale.label,
        color: palette.slate,
        paddingHorizontal: 16,
        paddingTop: 22,
        paddingBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function Button({
  label,
  onPress,
  danger,
  disabled,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: danger ? colors.danger : palette.navy,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: typeScale.label, color: danger ? colors.danger : palette.navy }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Recently deleted posts: restore one, or leave it to go after 30 days. */
function DeletedPosts({ accessToken }: { accessToken: string }) {
  const [posts, setPosts] = useState<DeletedPost[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    postApi
      .deleted(accessToken)
      .then((list) => live && setPosts(list))
      .catch((e) => live && setError(e?.message || "Could not load."));
    return () => {
      live = false;
    };
  }, [accessToken]);

  const restore = async (id: string) => {
    try {
      await postApi.restore(accessToken, id);
      setPosts((current) => (current ?? []).filter((post) => post.id !== id));
    } catch (e: any) {
      Alert.alert("Could not restore", e?.message || "Try again.");
    }
  };

  if (error) return <Text style={{ padding: 16, color: palette.crimson, fontFamily: fonts.body }}>{error}</Text>;
  if (!posts) return <ActivityIndicator style={{ margin: 16 }} color={palette.crimson} />;
  if (posts.length === 0)
    return <Text style={{ padding: 16, color: palette.slate, fontFamily: fonts.body }}>Nothing here. Deleted posts show for 30 days.</Text>;
  return (
    <View>
      {posts.map((post) => (
        <View key={post.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
          <Image
            source={{ uri: post.media_url }}
            style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: palette.paperSand }}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>
              {post.caption || "Photo post"}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>{daysLeft(post.deleted_at)}</Text>
          </View>
          <Button label="Restore" onPress={() => void restore(post.id)} />
        </View>
      ))}
      <Text style={{ paddingHorizontal: 16, paddingBottom: 8, fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
        Posts here are removed for good after 30 days.
      </Text>
    </View>
  );
}

/** Your archived stories: share one again for 24 hours, or delete it now. */
function ArchivedStories({ accessToken }: { accessToken: string }) {
  const [stories, setStories] = useState<ArchivedStory[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    storyApi
      .archived(accessToken)
      .then((list) => live && setStories(list))
      .catch((e) => live && setError(e?.message || "Could not load."));
    return () => {
      live = false;
    };
  }, [accessToken]);

  const shareAgain = async (id: string) => {
    try {
      await storyApi.repostArchived(accessToken, id);
      Alert.alert("Shared again", "Your story is up for 24 hours.");
    } catch (e: any) {
      Alert.alert("Could not share", e?.message || "Try again.");
    }
  };

  const remove = (id: string) =>
    Alert.alert("Delete this story?", "It will be gone for good.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await storyApi.deleteArchived(accessToken, id);
            setStories((current) => (current ?? []).filter((story) => story.id !== id));
          } catch (e: any) {
            Alert.alert("Could not delete", e?.message || "Try again.");
          }
        },
      },
    ]);

  if (error) return <Text style={{ padding: 16, color: palette.crimson, fontFamily: fonts.body }}>{error}</Text>;
  if (!stories) return <ActivityIndicator style={{ margin: 16 }} color={palette.crimson} />;
  if (stories.length === 0)
    return <Text style={{ padding: 16, color: palette.slate, fontFamily: fonts.body }}>No archived stories. Your stories land here after 24 hours.</Text>;
  return (
    <View>
      {stories.map((story) => (
        <View key={story.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
          <Image
            source={{ uri: story.media_url }}
            style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: palette.paperSand }}
          />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>{daysLeft(story.archived_at)}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button label="Share again" onPress={() => void shareAgain(story.id)} />
              <Button label="Delete" danger onPress={() => remove(story.id)} />
            </View>
          </View>
        </View>
      ))}
      <Text style={{ paddingHorizontal: 16, paddingBottom: 8, fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
        Only you see these. They are removed for good after 30 days.
      </Text>
    </View>
  );
}

/**
 * Your activity, like Instagram: what you did and what you shared, and the
 * things you removed that are still kept for 30 days.
 */
export function YourActivityScreen({
  accessToken,
  navigate,
  onBack,
}: {
  accessToken: string;
  navigate: (screen: any) => void;
  onBack: () => void;
}) {
  const [open, setOpen] = useState<null | "deleted" | "archived">(null);
  const toggle = (key: "deleted" | "archived") => setOpen((current) => (current === key ? null : key));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.paperBase }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={palette.ink} />
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: typeScale.title, color: palette.ink }}>Your activity</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Heading>Interactions</Heading>
        <Row icon="heart-outline" label="Likes and comments" onPress={() => navigate("likes")} />

        <Heading>Removed and archived content</Heading>
        <Row icon="trash-outline" label="Recently deleted" open={open === "deleted"} onPress={() => toggle("deleted")} />
        {open === "deleted" && <DeletedPosts accessToken={accessToken} />}
        <Row icon="time-outline" label="Archived stories" open={open === "archived"} onPress={() => toggle("archived")} />
        {open === "archived" && <ArchivedStories accessToken={accessToken} />}

        <Heading>Content you shared</Heading>
        <Row icon="grid-outline" label="Posts" onPress={() => navigate("profile")} />
        <Row icon="images-outline" label="Stories" open={open === "archived"} onPress={() => toggle("archived")} />
      </ScrollView>
    </SafeAreaView>
  );
}
