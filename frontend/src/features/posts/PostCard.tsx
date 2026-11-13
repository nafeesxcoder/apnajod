import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { postApi, type Post } from "../../api/postApi";
import { useReducedMotion } from "../../components/motion";
import { fonts, palette } from "../../theme";
import { PostImage } from "../profile/components/PostImage";
import { Avatar, CommentsSheet, LikersSheet, ReportSheet, ShareSheet, Sheet } from "./PostSheets";
import { countLabel, timeAgo } from "./postFormat";
import { canOpenProfile, openProfile } from "./profileLink";

const nativeDriver = Platform.OS !== "web";

/**
 * One post the way Instagram shows it:
 *
 *   (photo) username · 3h                        ...
 *   [ the photo - double-tap to like ]
 *   heart  comment  share                   bookmark
 *   23 likes
 *   username caption
 *   View all 4 comments
 *
 * Likes and saves change on screen at once and are put back if the server
 * says no. Tapping a name or photo opens that person's profile.
 */
export function PostCard({
  post: initial,
  accessToken,
  isOwner,
  onOwnerMenu,
  onBeforeOpenProfile,
  onChange,
}: {
  post: Post;
  accessToken: string;
  /** Your own post: the ... menu edits/deletes instead of reporting. */
  isOwner?: boolean;
  onOwnerMenu?: (post: Post) => void;
  /** Called before leaving for a profile (e.g. to close the viewer it sits in). */
  onBeforeOpenProfile?: () => void;
  onChange?: (post: Post) => void;
}) {
  const [post, setPost] = useState(initial);
  const [sheet, setSheet] = useState<null | "likes" | "comments" | "share" | "menu" | "report">(null);
  const [captionOpen, setCaptionOpen] = useState(false);
  const reduced = useReducedMotion();
  const heart = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);

  useEffect(() => setPost(initial), [initial]);

  const update = (next: Post) => {
    setPost(next);
    onChange?.(next);
  };

  const setLiked = async (on: boolean) => {
    const before = post;
    if (!!before.liked === on) return;
    update({ ...before, liked: on, likes: Math.max(0, (before.likes || 0) + (on ? 1 : -1)) });
    try {
      const counts = await postApi.like(accessToken, before.id, on);
      update({ ...before, liked: counts.liked, likes: counts.likes, comments: counts.comments, saved: counts.saved });
    } catch {
      update(before);
    }
  };

  const setSaved = async (on: boolean) => {
    const before = post;
    update({ ...before, saved: on });
    try {
      await postApi.save(accessToken, before.id, on);
    } catch {
      update(before);
    }
  };

  const burst = () => {
    if (reduced) return;
    heart.setValue(0);
    Animated.sequence([
      Animated.spring(heart, { toValue: 1, useNativeDriver: nativeDriver, speed: 18, bounciness: 12 }),
      Animated.delay(450),
      Animated.timing(heart, { toValue: 2, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: nativeDriver }),
    ]).start();
  };

  // Double-tap the photo to like it (never un-likes, like Instagram).
  const onPhotoPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      burst();
      void setLiked(true);
    } else {
      lastTap.current = now;
    }
  };

  const author = post.author;
  const goProfile = () => {
    if (!author || !canOpenProfile()) return;
    onBeforeOpenProfile?.();
    setTimeout(() => openProfile(author.userId), onBeforeOpenProfile ? 80 : 0);
  };

  const likes = post.likes || 0;
  const comments = post.comments || 0;
  const longCaption = (post.caption || "").length > 120;

  return (
    <View style={{ width: "100%", maxWidth: 600, alignSelf: "center", backgroundColor: palette.paper, paddingBottom: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 10 }}>
        {author ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open @${author.username}`}
            onPress={goProfile}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minHeight: 44 }}
          >
            <Avatar person={author} size={34} />
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: palette.ink }}>
              {author.username}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>· {timeAgo(post.created_at)}</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Post options"
          onPress={() => (isOwner && onOwnerMenu ? onOwnerMenu(post) : setSheet("menu"))}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={palette.ink} />
        </Pressable>
      </View>

      {/* Photo - double-tap to like */}
      <Pressable accessibilityRole="image" accessibilityLabel="Post photo. Double-tap to like." onPress={onPhotoPress}>
        <PostImage uri={post.media_url} aspect={post.aspect_ratio} />
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            opacity: heart.interpolate({ inputRange: [0, 0.2, 1, 2], outputRange: [0, 1, 1, 0] }),
            transform: [{ scale: heart.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1, 1.15] }) }],
          }}
        >
          <Ionicons name="heart" size={96} color="#FFFFFF" style={{ textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 12 }} />
        </Animated.View>
      </Pressable>

      {/* Actions */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingTop: 2 }}>
        <ActionButton
          icon={post.liked ? "heart" : "heart-outline"}
          color={post.liked ? palette.crimson : palette.ink}
          label={post.liked ? "Unlike" : "Like"}
          onPress={() => {
            if (!post.liked) burst();
            void setLiked(!post.liked);
          }}
        />
        <ActionButton icon="chatbubble-outline" label="Comment" onPress={() => setSheet("comments")} />
        <ActionButton icon="paper-plane-outline" label="Share" onPress={() => setSheet("share")} />
        <View style={{ flex: 1 }} />
        <ActionButton
          icon={post.saved ? "bookmark" : "bookmark-outline"}
          label={post.saved ? "Remove from saved" : "Save"}
          onPress={() => void setSaved(!post.saved)}
        />
      </View>

      {/* Likes, caption, comments */}
      <View style={{ paddingHorizontal: 14, gap: 4 }}>
        {likes > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel={`${countLabel(likes, "like", "likes")}. See who`} onPress={() => setSheet("likes")}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: palette.ink }}>{countLabel(likes, "like", "likes")}</Text>
          </Pressable>
        )}
        {!!post.caption && (
          <Text
            numberOfLines={captionOpen || !longCaption ? undefined : 2}
            onPress={longCaption && !captionOpen ? () => setCaptionOpen(true) : undefined}
            style={{ fontFamily: fonts.body, fontSize: 14, color: palette.ink, lineHeight: 20 }}
          >
            {author && (
              <Text onPress={goProfile} style={{ fontFamily: fonts.bodyBold }}>
                {author.username}{" "}
              </Text>
            )}
            {post.caption}
          </Text>
        )}
        {longCaption && !captionOpen && (
          <Text onPress={() => setCaptionOpen(true)} style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>
            more
          </Text>
        )}
        <Pressable accessibilityRole="button" onPress={() => setSheet("comments")} style={{ minHeight: 24, justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate }}>
            {comments === 0
              ? "Add a comment..."
              : comments === 1
                ? "View 1 comment"
                : `View all ${countLabel(comments, "comment", "comments")}`}
          </Text>
        </Pressable>
      </View>

      <LikersSheet visible={sheet === "likes"} accessToken={accessToken} postId={post.id} onClose={() => setSheet(null)} />
      <CommentsSheet
        visible={sheet === "comments"}
        accessToken={accessToken}
        post={post}
        onClose={() => setSheet(null)}
        onCountChange={(count) => count !== comments && update({ ...post, comments: count })}
      />
      <ShareSheet visible={sheet === "share"} accessToken={accessToken} post={post} onClose={() => setSheet(null)} />
      <ReportSheet visible={sheet === "report"} accessToken={accessToken} post={post} onClose={() => setSheet(null)} />
      <Sheet visible={sheet === "menu"} title="Post" onClose={() => setSheet(null)}>
        <MenuRow icon="paper-plane-outline" label="Share" onPress={() => setSheet("share")} />
        <MenuRow
          icon={post.saved ? "bookmark" : "bookmark-outline"}
          label={post.saved ? "Remove from saved" : "Save"}
          onPress={() => {
            setSheet(null);
            void setSaved(!post.saved);
          }}
        />
        {author && canOpenProfile() && (
          <MenuRow icon="person-circle-outline" label="About this account" onPress={() => { setSheet(null); goProfile(); }} />
        )}
        {!isOwner && <MenuRow icon="flag-outline" label="Report" danger onPress={() => setSheet("report")} />}
      </Sheet>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color = palette.ink,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={25} color={color} />
    </Pressable>
  );
}

function MenuRow({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, minHeight: 54 }}
    >
      <Ionicons name={icon} size={21} color={danger ? palette.crimson : palette.ink} />
      <Text style={{ fontFamily: fonts.body, fontSize: 16, color: danger ? palette.crimson : palette.ink }}>{label}</Text>
    </Pressable>
  );
}
