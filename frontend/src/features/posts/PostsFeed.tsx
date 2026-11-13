import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { postApi, type Post } from "../../api/postApi";
import { PressScale } from "../../components/motion";
import { fonts, palette, radius, typeScale } from "../../theme";
import { primePostSizes } from "../profile/components/PostImage";
import { PostCard } from "./PostCard";

/**
 * The posts on Home, like Instagram's feed: everyone public, plus the people
 * you have matched with, newest first. More load as you reach the end
 * (`loadMoreSignal` goes up when Home is scrolled near the bottom), or with
 * the button.
 */
export function PostsFeed({
  accessToken,
  loadMoreSignal = 0,
  reloadKey = 0,
}: {
  accessToken?: string;
  loadMoreSignal?: number;
  /** Bump to start again from the newest (pull to refresh, a new post). */
  reloadKey?: number;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "more" | "error">("loading");
  const busy = useRef(false);

  const load = useCallback(
    async (cursor: string | null) => {
      if (!accessToken || busy.current) return;
      busy.current = true;
      setState(cursor ? "more" : "loading");
      try {
        const page = await postApi.feed(accessToken, cursor);
        primePostSizes(page.posts.map((post) => post.media_url));
        setPosts((current) => {
          if (!cursor) return page.posts;
          const seen = new Set(current.map((post) => post.id));
          return [...current, ...page.posts.filter((post) => !seen.has(post.id))];
        });
        setNext(page.next);
        setState("ready");
      } catch {
        setState("error");
      } finally {
        busy.current = false;
      }
    },
    [accessToken],
  );

  useEffect(() => {
    void load(null);
  }, [load, reloadKey]);

  useEffect(() => {
    if (loadMoreSignal && next && state === "ready") void load(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMoreSignal]);

  if (!accessToken) return null;

  return (
    <View style={{ width: "100%", marginTop: 8 }}>
      <View style={{ width: "100%", maxWidth: 600, alignSelf: "center", paddingHorizontal: 20, marginBottom: 10 }}>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: typeScale.section, color: palette.ink }}>
          Posts
        </Text>
      </View>

      {state === "loading" && posts.length === 0 ? (
        <ActivityIndicator color={palette.crimson} style={{ marginVertical: 24 }} />
      ) : state === "error" && posts.length === 0 ? (
        <FeedNote icon="cloud-offline-outline" text="Could not load posts." action="Try again" onPress={() => void load(null)} />
      ) : posts.length === 0 ? (
        <FeedNote
          icon="images-outline"
          text="No posts yet. When public accounts and your matches post, they show up here."
        />
      ) : (
        <View style={{ gap: 10 }}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              accessToken={accessToken}
              onChange={(changed) =>
                setPosts((current) => current.map((item) => (item.id === changed.id ? changed : item)))
              }
            />
          ))}
          {next ? (
            state === "more" ? (
              <ActivityIndicator color={palette.crimson} style={{ marginVertical: 18 }} />
            ) : (
              <PressScale
                accessibilityRole="button"
                accessibilityLabel="Show more posts"
                onPress={() => void load(next)}
                containerStyle={{ alignSelf: "center", marginVertical: 12 }}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 22,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: palette.crimsonSoft,
                  backgroundColor: palette.paper,
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.crimson }}>Show more posts</Text>
              </PressScale>
            )
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 18, gap: 6 }}>
              <Ionicons name="checkmark-circle-outline" size={28} color={palette.slate} />
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>You are all caught up</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function FeedNote({
  icon,
  text,
  action,
  onPress,
}: {
  icon: "images-outline" | "cloud-offline-outline";
  text: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 26, paddingHorizontal: 30, gap: 10 }}>
      <Ionicons name={icon} size={30} color={palette.slate} />
      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate, textAlign: "center", lineHeight: 19 }}>
        {text}
      </Text>
      {!!action && (
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={action}
          onPress={onPress}
          style={{
            minHeight: 44,
            paddingHorizontal: 20,
            borderRadius: radius.pill,
            backgroundColor: palette.crimson,
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: "#FFFFFF" }}>{action}</Text>
        </PressScale>
      )}
    </View>
  );
}
