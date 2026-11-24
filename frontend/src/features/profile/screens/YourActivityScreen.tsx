import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { postApi, type DeletedPost } from "../../../api/postApi";
import { storyApi, type ArchivedStory } from "../../../api/storyApi";
import { serverMs } from "../../../domain/serverTime";
import { colors, fonts, palette, radius, typeScale } from "../../../theme";
import { openStoryEditorWith } from "../../stories/storyStore";

const DAY_MS = 24 * 60 * 60 * 1000;
const KEEP_DAYS = 30;

/** "3 days left" from when something was deleted or archived. */
function daysLeft(iso: string | null | undefined): string {
  const at = serverMs(iso ?? "");
  if (Number.isNaN(at)) return "";
  const left = Math.max(0, KEEP_DAYS - Math.floor((Date.now() - at) / DAY_MS));
  return left === 0 ? "Removed today" : `${left} ${left === 1 ? "day" : "days"} left`;
}

/** "Posted 3 days ago", from when the story was shared. */
function postedAgo(iso: string | null | undefined): string {
  const at = serverMs(iso ?? "");
  if (Number.isNaN(at)) return "";
  const days = Math.max(0, Math.floor((Date.now() - at) / DAY_MS));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  return `Posted ${days} days ago`;
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

/** Recently deleted posts and stories: restore one, or leave it to go after 30 days. */
function DeletedContent({ accessToken }: { accessToken: string }) {
  const [posts, setPosts] = useState<DeletedPost[] | null>(null);
  const [stories, setStories] = useState<ArchivedStory[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let live = true;
    Promise.all([postApi.deleted(accessToken), storyApi.deleted(accessToken)])
      .then(([postList, storyList]) => {
        if (!live) return;
        setPosts(postList);
        setStories(storyList);
      })
      .catch((e) => live && setError(e?.message || "Could not load."));
    return () => {
      live = false;
    };
  }, [accessToken]);

  const restorePost = async (id: string) => {
    setNotice("");
    try {
      await postApi.restore(accessToken, id);
      setPosts((current) => (current ?? []).filter((post) => post.id !== id));
    } catch (e: any) {
      setNotice(e?.message || "Could not restore. Try again.");
    }
  };

  const restoreStory = async (id: string) => {
    setNotice("");
    try {
      await storyApi.restoreDeleted(accessToken, id);
      setStories((current) => (current ?? []).filter((story) => story.id !== id));
    } catch (e: any) {
      setNotice(e?.message || "Could not restore. Try again.");
    }
  };

  if (error) return <Text style={{ padding: 16, color: palette.crimson, fontFamily: fonts.body }}>{error}</Text>;
  if (!posts || !stories) return <ActivityIndicator style={{ margin: 16 }} color={palette.crimson} />;
  if (posts.length === 0 && stories.length === 0)
    return <Text style={{ padding: 16, color: palette.slate, fontFamily: fonts.body }}>Nothing here. Deleted posts and stories show for 30 days.</Text>;
  return (
    <View>
      {!!notice && <Text style={{ paddingHorizontal: 16, paddingTop: 12, color: palette.crimson, fontFamily: fonts.body, fontSize: 13 }}>{notice}</Text>}
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
          <Button label="Restore" onPress={() => void restorePost(post.id)} />
        </View>
      ))}
      {stories.map((story) => (
        <View key={story.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
          <Image
            source={{ uri: story.media_url }}
            style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: palette.paperSand }}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>Story</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>{daysLeft(story.created_at)}</Text>
          </View>
          <Button label="Restore" onPress={() => void restoreStory(story.id)} />
        </View>
      ))}
      <Text style={{ paddingHorizontal: 16, paddingBottom: 8, fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
        Restored stories go to your archive. Everything here is removed for good after 30 days.
      </Text>
    </View>
  );
}

/** Your archived stories: share one again for 24 hours, or delete it now. */
function ArchivedStories({ accessToken, navigate }: { accessToken: string; navigate: (screen: any) => void }) {
  const [stories, setStories] = useState<ArchivedStory[] | null>(null);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
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

  // Share again opens the story editor with this photo: edit it, then press Share.
  const shareAgain = (story: ArchivedStory) => {
    openStoryEditorWith({ uri: story.media_url, width: 1080, height: 1920 });
    navigate("home");
  };

  // Delete for good: the server removes the photo and the row at once.
  const remove = async (id: string) => {
    setBusyId(id);
    setNotice("");
    try {
      await storyApi.deleteArchived(accessToken, id);
      setStories((current) => (current ?? []).filter((story) => story.id !== id));
      setConfirmId(null);
    } catch (e: any) {
      setNotice(e?.message || "Could not delete. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <Text style={{ padding: 16, color: palette.crimson, fontFamily: fonts.body }}>{error}</Text>;
  if (!stories) return <ActivityIndicator style={{ margin: 16 }} color={palette.crimson} />;
  if (stories.length === 0)
    return <Text style={{ padding: 16, color: palette.slate, fontFamily: fonts.body }}>No archived stories. Your stories land here after 24 hours.</Text>;
  return (
    <View>
      {!!notice && <Text style={{ paddingHorizontal: 16, paddingTop: 12, color: palette.crimson, fontFamily: fonts.body, fontSize: 13 }}>{notice}</Text>}
      {stories.map((story) => (
        <View key={story.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
          <Image
            source={{ uri: story.media_url }}
            style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: palette.paperSand }}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink }}>{postedAgo(story.created_at)}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>{daysLeft(story.archived_at)}</Text>
            {confirmId === story.id ? (
              <View style={{ gap: 8, marginTop: 4 }}>
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: colors.danger }}>Delete for good? This cannot be undone.</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button label="Yes, delete" danger disabled={busyId === story.id} onPress={() => void remove(story.id)} />
                  <Button label="Cancel" onPress={() => setConfirmId(null)} />
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <Button label="Share again" onPress={() => shareAgain(story)} />
                <Button
                  label="Delete"
                  danger
                  onPress={() => {
                    setNotice("");
                    setConfirmId(story.id);
                  }}
                />
              </View>
            )}
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
        {open === "deleted" && <DeletedContent accessToken={accessToken} />}
        <Row icon="time-outline" label="Archived stories" open={open === "archived"} onPress={() => toggle("archived")} />
        {open === "archived" && <ArchivedStories accessToken={accessToken} navigate={navigate} />}

        <Heading>Content you shared</Heading>
        <Row icon="grid-outline" label="Posts" onPress={() => navigate("profile")} />
        <Row icon="images-outline" label="Stories" open={open === "archived"} onPress={() => toggle("archived")} />
      </ScrollView>
    </SafeAreaView>
  );
}
