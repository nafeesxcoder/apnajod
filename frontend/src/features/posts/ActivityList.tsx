import { Image, Pressable, Text } from "react-native";

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
export function openItem(item: ActivityItem) {
  if (item.post) openPost(item.post.id);
  else if (item.kind === "mention") {
    if (!openStoriesOf(item.actor.userId)) openProfile(item.actor.userId);
  } else if (!openMyStories()) openProfile(item.actor.userId);
}

/**
 * Your activity, newest first. Loading it clears the count on the bell; the
 * "new" marks stay for this visit.
 */
export async function loadActivity(accessToken: string): Promise<ActivityItem[]> {
  const result = await postApi.activity(accessToken);
  if (result.unread > 0) void postApi.markActivitySeen(accessToken).catch(() => undefined);
  return result.items;
}

/** One event as a row: who, what, and a thumbnail of the post or story. */
export function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.actor.username}${activityText(item)} Open ${item.post ? "the post" : "the story"}`}
      onPress={() => openItem(item)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: palette.ruleSoft,
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
      {(item.post ?? item.story) && (
        <Image
          source={{ uri: (item.post ?? item.story)?.mediaUrl }}
          style={{ width: 46, height: 46, borderRadius: 6, backgroundColor: palette.paperSand }}
        />
      )}
    </Pressable>
  );
}
