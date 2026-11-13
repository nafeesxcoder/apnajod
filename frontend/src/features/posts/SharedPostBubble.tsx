import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { Post } from "../../api/postApi";
import { fonts, palette } from "../../theme";
import { loadPost, openPost } from "./profileLink";

/**
 * A post someone sent in a chat, shown the way Instagram shows it in a DM:
 * the photo with who posted it and the caption, not a bare link. Tap to
 * open the full post (like, comment, share). If it was deleted or the
 * account is private to you, it says so.
 */
export function SharedPostBubble({ postId, mine }: { postId: string; mine: boolean }) {
  const [post, setPost] = useState<Post | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "gone">("loading");

  useEffect(() => {
    let live = true;
    setState("loading");
    loadPost(postId)
      .then((found) => {
        if (!live) return;
        setPost(found);
        setState("ready");
      })
      .catch(() => live && setState("gone"));
    return () => {
      live = false;
    };
  }, [postId]);

  const border = mine ? "rgba(255,255,255,0.35)" : palette.rule;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        post?.author ? `Post by @${post.author.username}. Open it` : state === "gone" ? "Post not available" : "Shared post"
      }
      disabled={state !== "ready"}
      onPress={() => openPost(postId)}
      style={{
        width: 220,
        maxWidth: "100%",
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: border,
        backgroundColor: palette.paper,
        marginVertical: 2,
      }}
    >
      {state === "loading" ? (
        <View style={{ height: 120, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={palette.crimson} />
        </View>
      ) : state === "gone" || !post ? (
        <View style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="lock-closed-outline" size={20} color={palette.slate} />
          <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 13, color: palette.slate, lineHeight: 18 }}>
            Post not available. It may have been deleted, or the account is private.
          </Text>
        </View>
      ) : (
        <>
          {post.author && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
              {post.author.avatarUrl ? (
                <Image source={{ uri: post.author.avatarUrl }} style={{ width: 24, height: 24, borderRadius: 12 }} />
              ) : (
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: palette.crimsonTint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: palette.crimson }}>
                    {post.author.username.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: palette.ink }}>
                {post.author.username}
              </Text>
            </View>
          )}
          <Image
            source={{ uri: post.media_url }}
            style={{ width: "100%", aspectRatio: post.aspect_ratio || 1, backgroundColor: palette.paperSand }}
            resizeMode="cover"
          />
          {!!post.caption && (
            <Text numberOfLines={2} style={{ fontFamily: fonts.body, fontSize: 13, color: palette.ink, padding: 10, lineHeight: 18 }}>
              <Text style={{ fontFamily: fonts.bodyBold }}>{post.author?.username} </Text>
              {post.caption}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}
