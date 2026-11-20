import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { postApi, type ActivityItem } from "../../api/postApi";
import { fonts, palette } from "../../theme";
import { Avatar } from "./PostSheets";
import { timeAgo } from "./postFormat";
import { openPost, openProfile } from "./profileLink";
import { openMyStories, openStoriesOf } from "../stories/storyStore";

/** What happened, in words: "liked your story.", "commented: Wow". */
export function activityText(item: ActivityItem): string {
  switch (item.kind) {
    case "like":
      return " liked your post.";
    case "comment":
      return ` commented: ${item.body ?? ""}`;
    case "reply":
      return ` replied to your comment: ${item.body ?? ""}`;
    case "story_like":
      return " liked your story.";
    case "story_answer":
      return ` answered your question: ${item.body ?? ""}`;
    case "mention":
      return " mentioned you in their story.";
    default:
      return "";
  }
}

/** Tapping a row: a post opens the post, a story plays that story. */
function openItem(item: ActivityItem) {
  if (item.post) openPost(item.post.id);
  else if (item.kind === "mention") {
    if (!openStoriesOf(item.actor.userId)) openProfile(item.actor.userId);
  } else if (!openMyStories()) openProfile(item.actor.userId);
}

/**
 * Activity: likes and comments on your posts, likes and answers on your
 * stories and stories that mention you, newest first, new ones marked. It is
 * the Activity tab of Notifications (the bell on Home); opening it clears its
 * count. Tap a row to open the post or story; tap a photo or name to open
 * that person.
 */
export function ActivityList({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setItems(null);
    setError("");
    postApi
      .activity(accessToken)
      .then((result) => {
        if (!live) return;
        setItems(result.items);
        // Seen now: the count on the bell goes. The "new" marks stay for this visit.
        if (result.unread > 0) void postApi.markActivitySeen(accessToken).catch(() => undefined);
      })
      .catch((e) => live && setError(e?.message || "Could not load activity."));
    return () => {
      live = false;
    };
  }, [accessToken]);

  if (items === null && !error) return <ActivityIndicator style={{ marginTop: 40 }} color={palette.crimson} />;
  if (error) {
    return <Text style={{ textAlign: "center", color: palette.crimson, fontFamily: fonts.body, margin: 30 }}>{error}</Text>;
  }
  if (items!.length === 0) {
    return (
      <View style={{ alignItems: "center", padding: 40, gap: 10 }}>
        <Ionicons name="chatbubbles-outline" size={40} color={palette.slate} />
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: palette.ink }}>No activity yet</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate, textAlign: "center", lineHeight: 19 }}>
          When someone likes or comments on your posts, likes your story or mentions you, it shows up here. Your own likes and comments don't.
        </Text>
      </View>
    );
  }
  // A plain list, not a FlatList: it sits inside the Notifications page's scroll.
  return (
    <View style={{ paddingVertical: 6 }}>
      {items!.map((item, index) => (
        <Pressable
          key={`${item.kind}-${(item.post ?? item.story)?.id}-${item.actor.userId}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={`${item.actor.username}${activityText(item)} Open ${item.post ? "the post" : "the story"}`}
          onPress={() => openItem(item)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: item.isNew ? palette.crimsonTint : "transparent",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open @${item.actor.username}`}
            onPress={() => openProfile(item.actor.userId)}
          >
            <Avatar person={item.actor} size={44} />
          </Pressable>
          <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: palette.ink, lineHeight: 20 }}>
            <Text style={{ fontFamily: fonts.bodyBold }}>{item.actor.username}</Text>
            {activityText(item)}
            <Text style={{ color: palette.slate }}> {timeAgo(item.at)}</Text>
          </Text>
          <Image
            source={{ uri: (item.post ?? item.story)?.mediaUrl }}
            style={{ width: 46, height: 46, borderRadius: 6, backgroundColor: palette.paperSand }}
          />
        </Pressable>
      ))}
    </View>
  );
}
