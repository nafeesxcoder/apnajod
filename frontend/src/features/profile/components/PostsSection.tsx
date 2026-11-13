import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { postApi, type Post } from "../../../api/postApi";
import { CaptionEditor } from "./CaptionEditor";
import { PostCard } from "../../posts/PostCard";
import { primePostSizes } from "./PostImage";

const PINK = "#5087BE";
const DARK = "#151719";
const MUTED = "#5A5E63";
const LINE = "#D3D6DA";
const DANGER = "#B3261E";

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
  // A private account you have not matched with: its posts stay hidden.
  const [locked, setLocked] = useState(false);
  // Your own profile has two tabs, like Instagram: your posts, and the
  // posts you saved (only you see those).
  const [tab, setTab] = useState<"posts" | "saved">("posts");
  const [savedPosts, setSavedPosts] = useState<Post[] | null>(null);
  const showSaved = isOwner && !userId && tab === "saved";
  const shown = showSaved ? savedPosts ?? [] : posts;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<Post | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [draftCaption, setDraftCaption] = useState("");
  // Index of the post opened from the grid; null while the feed is closed.
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const isViewing = viewingIndex !== null;
  const pushedRef = useRef(false);
  const listRef = useRef<FlatList<Post>>(null);

  // On the web the browser Back button must close the feed and stay on this
  // page. Opening the feed adds one history entry; Back removes it. The
  // listener runs first (capture) and stops the app-wide back handler, which
  // would otherwise treat this Back as "leave the profile".
  useEffect(() => {
    if (!isViewing || Platform.OS !== "web" || typeof window === "undefined")
      return;
    window.history.pushState(window.history.state, "");
    pushedRef.current = true;
    const onPop = (event: PopStateEvent) => {
      if (!pushedRef.current) return;
      pushedRef.current = false;
      event.stopImmediatePropagation();
      setViewingIndex(null);
    };
    window.addEventListener("popstate", onPop, true);
    return () => window.removeEventListener("popstate", onPop, true);
  }, [isViewing]);

  const closeViewer = useCallback(() => {
    if (Platform.OS === "web" && pushedRef.current && typeof window !== "undefined")
      window.history.back();
    else setViewingIndex(null);
  }, []);

  const load = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      if (userId) {
        const result = await postApi.of(accessToken, userId);
        setPosts(result.posts);
        setLocked(result.locked);
      } else {
        setPosts(await postApi.mine(accessToken));
        setLocked(false);
      }
    } catch (err: any) {
      setError(err.message || "Could not load posts.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, userId]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  // Read every photo's real shape while the grid shows, so the opened
  // viewer lays each post out at its final height and does not jump.
  useEffect(() => {
    primePostSizes([...posts, ...(savedPosts ?? [])].map((post) => post.media_url));
  }, [posts, savedPosts]);

  useEffect(() => {
    if (!showSaved || !accessToken) return;
    let live = true;
    postApi
      .saved(accessToken)
      .then((rows) => live && setSavedPosts(rows))
      .catch((err) => live && setError(err?.message || "Could not load saved posts."));
    return () => {
      live = false;
    };
  }, [showSaved, accessToken, reloadKey]);

  /** A like, save or new comment on a post in the viewer, kept in the grid's copy. */
  const replacePost = (next: Post) => {
    setPosts((current) => current.map((post) => (post.id === next.id ? next : post)));
    setSavedPosts((current) =>
      current ? (next.saved ? current.map((post) => (post.id === next.id ? next : post)) : current) : current,
    );
  };


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

      {isOwner && !userId && (
        <View style={{ flexDirection: "row", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: LINE }}>
          {(["posts", "saved"] as const).map((key) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={key === "posts" ? "Your posts" : "Saved posts, only you can see these"}
                onPress={() => setTab(key)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                  borderBottomWidth: 2,
                  borderBottomColor: active ? DARK : "transparent",
                  marginBottom: -1,
                }}
              >
                <Ionicons
                  name={key === "posts" ? "grid-outline" : active ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={active ? DARK : MUTED}
                />
                <Text style={{ fontSize: 13, fontWeight: "600", color: active ? DARK : MUTED }}>
                  {key === "posts" ? "Posts" : "Saved"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {showSaved && savedPosts === null ? (
        <ActivityIndicator color={PINK} style={{ marginVertical: 20 }} />
      ) : showSaved && savedPosts!.length === 0 ? (
        <View style={{ paddingVertical: 28, alignItems: "center", gap: 6 }}>
          <Ionicons name="bookmark-outline" size={28} color={MUTED} />
          <Text style={{ color: MUTED, fontSize: 13, textAlign: "center" }}>
            Save posts you want to see again. Only you can see what you have saved.
          </Text>
        </View>
      ) : locked ? (
        <View
          accessibilityRole="summary"
          style={{
            borderWidth: 1,
            borderColor: LINE,
            borderRadius: 14,
            paddingVertical: 28,
            paddingHorizontal: 16,
            alignItems: "center",
            gap: 6,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              borderWidth: 2,
              borderColor: DARK,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="lock-closed-outline" size={26} color={DARK} />
          </View>
          <Text style={{ color: DARK, fontSize: 16, fontWeight: "700", marginTop: 6 }}>
            This account is private
          </Text>
          <Text style={{ color: MUTED, fontSize: 13, textAlign: "center", lineHeight: 19 }}>
            Match with them to see their posts.
          </Text>
        </View>
      ) : posts.length === 0 ? (
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
          {shown.map((post, index) => (
            <View key={post.id} style={{ width: "31.5%" }}>
              <View style={{ position: "relative" }}>
                <Pressable
                  accessibilityRole="imagebutton"
                  accessibilityLabel="Open post"
                  onPress={() => setViewingIndex(index)}
                >
                  <Image
                    source={{ uri: post.media_url }}
                    style={{ width: "100%", aspectRatio: 1, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                </Pressable>
                {isOwner && !showSaved && (
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

      {/* Instagram-style feed: tap a post, then scroll through all of them */}
      <Modal
        visible={isViewing}
        animationType="slide"
        onRequestClose={closeViewer}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: LINE,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={closeViewer}
              hitSlop={12}
              style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="arrow-back" size={24} color={DARK} />
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: "700", color: DARK }}>Posts</Text>
          </View>
          {viewingIndex !== null && (
            <FlatList
              ref={listRef}
              style={{ flex: 1 }}
              data={shown}
              keyExtractor={(post) => post.id}
              initialScrollIndex={Math.min(viewingIndex, Math.max(shown.length - 1, 0))}
              onScrollToIndexFailed={(info) => {
                setTimeout(
                  () => listRef.current?.scrollToIndex({ index: info.index, animated: false }),
                  120,
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) =>
                accessToken ? (
                  // The full Instagram post: like (or double-tap), comment,
                  // share, save; tap a name to open that profile.
                  <View style={{ marginBottom: 10 }}>
                    <PostCard
                      post={item}
                      accessToken={accessToken}
                      isOwner={isOwner && !showSaved}
                      onOwnerMenu={(post) => {
                        closeViewer();
                        setTimeout(() => setMenuFor(post), 350);
                      }}
                      onBeforeOpenProfile={closeViewer}
                      onChange={replacePost}
                    />
                  </View>
                ) : null
              }
            />
          )}
        </SafeAreaView>
      </Modal>

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

