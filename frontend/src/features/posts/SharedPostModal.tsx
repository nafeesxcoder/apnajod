import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { postApi, type Post } from "../../api/postApi";
import { fonts, palette } from "../../theme";
import { PostCard } from "./PostCard";
import { userIdFromToken } from "./profileLink";

/** The post id in a shared link (https://apnajoda.com/?post=<id>), if any. */
export function readPostParam(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    const id = new URLSearchParams(window.location.search).get("post");
    return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Takes ?post= off the address, so a refresh does not open it again. */
export function clearPostParam() {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("post")) return;
    url.searchParams.delete("post");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    // Leave the address as it is.
  }
}

/**
 * A post opened from a shared link. Shown only if you are allowed to see it:
 * a private account's post says it is not available, the same as a deleted one.
 */
export function SharedPostModal({
  postId,
  accessToken,
  onClose,
}: {
  postId: string;
  accessToken: string;
  onClose: () => void;
}) {
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setPost(null);
    setError("");
    postApi
      .get(accessToken, postId)
      .then((found) => live && setPost(found))
      .catch(() => live && setError("This post is not available. It may have been deleted, or the account is private."));
    return () => {
      live = false;
    };
  }, [postId, accessToken]);

  const close = () => {
    clearPostParam();
    onClose();
  };

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }} edges={["top", "bottom"]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 6,
            minHeight: 52,
            borderBottomWidth: 1,
            borderBottomColor: palette.rule,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close post"
            onPress={close}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="arrow-back" size={24} color={palette.ink} />
          </Pressable>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: palette.ink }}>Post</Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {post ? (
            <PostCard
              post={post}
              accessToken={accessToken}
              isOwner={post.author?.userId === userIdFromToken(accessToken)}
              onBeforeOpenProfile={close}
            />
          ) : error ? (
            <View style={{ alignItems: "center", padding: 40, gap: 10 }}>
              <Ionicons name="lock-closed-outline" size={36} color={palette.slate} />
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate, textAlign: "center", lineHeight: 20 }}>
                {error}
              </Text>
            </View>
          ) : (
            <ActivityIndicator style={{ marginTop: 60 }} color={palette.crimson} />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
