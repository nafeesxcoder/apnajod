import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { postApi, type Post } from "../../../api/postApi";
import { CaptionEditor } from "./CaptionEditor";

const PINK = "#E6286F";
const DARK = "#1A1416";
const MUTED = "#635A5D";
const LINE = "#E2D9CB";
const DANGER = "#B00020";

/**
 * The photos a member has posted, with the line they wrote under each.
 *
 * This section used to render three Unsplash pictures from a constant, on
 * every profile, with a note to wire the real thing in later. So a brand new
 * account looked like it had already posted, and the pictures were of
 * strangers.
 *
 * Read-only when looking at somebody else: the menu, the editor and the add
 * button only exist on your own profile.
 */
export function PostsSection({
  accessToken,
  userId,
  isOwner,
  reloadKey = 0,
}: {
  accessToken?: string;
  /** Whose posts to show. Omit for your own. */
  userId?: string;
  isOwner: boolean;
  /** Bump this after posting elsewhere on the screen to reload the list. */
  reloadKey?: number;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<Post | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [draftCaption, setDraftCaption] = useState("");

  const load = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const rows = userId
        ? await postApi.of(accessToken, userId)
        : await postApi.mine(accessToken);
      setPosts(rows);
    } catch (err: any) {
      setError(err.message || "Could not load posts.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, userId]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);


  const saveCaption = async () => {
    if (!accessToken || !editing) return;
    setBusy(true);
    try {
      await postApi.updateCaption(accessToken, editing.id, draftCaption);
      setPosts((current) =>
        current.map((post) =>
          post.id === editing.id ? { ...post, caption: draftCaption } : post,
        ),
      );
      setEditing(null);
    } catch (err: any) {
      setError(err.message || "Could not save that.");
    } finally {
      setBusy(false);
    }
  };

  const removePost = async (post: Post) => {
    if (!accessToken) return;
    setMenuFor(null);
    setBusy(true);
    try {
      await postApi.remove(accessToken, post.id);
      setPosts((current) => current.filter((row) => row.id !== post.id));
    } catch (err: any) {
      setError(err.message || "Could not delete that.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={{ paddingVertical: 24, alignItems: "center" }}>
        <ActivityIndicator color={PINK} />
      </View>
    );
  }

  return (
    <View>
      {!!error && (
        <Text style={{ color: DANGER, fontSize: 13, marginBottom: 10 }}>
          {error}
        </Text>
      )}

      {posts.length === 0 ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: LINE,
            borderStyle: "dashed",
            borderRadius: 14,
            paddingVertical: 28,
            paddingHorizontal: 16,
            alignItems: "center",
          }}
        >
          <Ionicons name="images-outline" size={28} color={MUTED} />
          <Text style={{ color: MUTED, fontSize: 13, marginTop: 8, textAlign: "center" }}>
            {isOwner
              ? "Nothing posted yet. Add a photo and say something about it."
              : "They have not posted anything yet."}
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {posts.map((post) => (
            <View key={post.id} style={{ width: "31.5%" }}>
              <View style={{ position: "relative" }}>
                <Image
                  source={{ uri: post.media_url }}
                  style={{ width: "100%", aspectRatio: 1, borderRadius: 10 }}
                  resizeMode="cover"
                />
                {isOwner && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Post options"
                    onPress={() => setMenuFor(post)}
                    hitSlop={8}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      backgroundColor: "rgba(0,0,0,0.45)",
                      borderRadius: 12,
                      padding: 3,
                    }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={14} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
              {!!post.caption && (
                <Text
                  numberOfLines={2}
                  style={{ fontSize: 11, color: MUTED, marginTop: 4 }}
                >
                  {post.caption}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Post options */}
      <Modal visible={!!menuFor} transparent animationType="fade">
        <Pressable
          onPress={() => setMenuFor(null)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        >
          <View style={{ backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingVertical: 8 }}>
            <TouchableOpacity
              onPress={() => {
                setDraftCaption(menuFor?.caption ?? "");
                setEditing(menuFor);
                setMenuFor(null);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 22, paddingVertical: 16 }}
            >
              <Ionicons name="create-outline" size={20} color={DARK} />
              <Text style={{ fontSize: 16, color: DARK }}>Edit caption</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => menuFor && removePost(menuFor)}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 22, paddingVertical: 16 }}
            >
              <Ionicons name="trash-outline" size={20} color={DANGER} />
              <Text style={{ fontSize: 16, color: DANGER }}>Delete post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMenuFor(null)}
              style={{ paddingHorizontal: 22, paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ fontSize: 15, color: MUTED }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <CaptionEditor
        visible={!!editing}
        value={draftCaption}
        busy={busy}
        onChange={setDraftCaption}
        onCancel={() => setEditing(null)}
        onSave={saveCaption}
      />
    </View>
  );
}
