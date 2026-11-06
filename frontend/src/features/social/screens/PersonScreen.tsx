/**
 * Someone else's page.
 *
 * This is where a like is decided, so it has to show enough to decide on:
 * their photos, age, city, work and their own words. It used to show a
 * username, a letter in a grey circle and two follower counts that were
 * always zero - leftovers from the follow system this app replaced with
 * liking - which told a member nothing about the person who had just liked
 * them.
 *
 * One action, and it depends only on where the like stands: Like, Accept,
 * Pending, or Message once it is mutual. Offering "Like" to somebody you
 * already matched with is how a member ends up unsure what happened.
 */
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import type { PersonPage } from "../../../api/socialApi";
import { colors } from "../../../theme";
import { social } from "../../../theme/socialStyles";
import { Avatar } from "./FindPeopleScreen";

export function PersonScreen({
  userId,
  onBack,
  onLoad,
  onFollow,
  onMessage,
  onBlock,
}: {
  userId: string;
  onBack: () => void;
  onLoad: (userId: string) => Promise<PersonPage>;
  /** Like them, or accept their like: the same decision either way. */
  onFollow: (userId: string) => Promise<"accepted" | "pending">;
  onMessage: (page: PersonPage) => void;
  onBlock?: (userId: string) => void;
}) {
  const [page, setPage] = useState<PersonPage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setPage(null);
    setError("");
    onLoad(userId)
      .then((p) => active && setPage(p))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Could not open this account."));
    return () => {
      active = false;
    };
  }, [userId, onLoad]);

  /**
   * Like, or accept a like. Both are the same decision to the server; the
   * difference is only whether the other person got there first.
   *
   * When it turns out mutual, the chat opens straight away. Accepting is
   * the member saying they want to talk, so sending them off to find the
   * thread themselves is a step nobody wants.
   */
  const like = async () => {
    if (!page || busy) return;
    setBusy(true);
    setError("");
    try {
      const outcome = await onFollow(userId);
      const fresh = await onLoad(userId).catch(() => null);
      if (fresh) setPage(fresh);
      if (outcome === "accepted" || fresh?.like.matched) {
        onMessage(fresh ?? page);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !page) {
    return (
      <Shell onBack={onBack} title="">
        <View style={social.center}>
          <Ionicons name="alert-circle-outline" size={34} color={colors.muted} />
          <Text style={social.emptyText}>{error}</Text>
        </View>
      </Shell>
    );
  }

  if (!page) {
    return (
      <Shell onBack={onBack} title="">
        <View style={social.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Shell>
    );
  }

  const { user, profile, state } = page;
  const likeStatus = page.like.status;
  const cover = profile.photos[0] || user.avatarUrl || "";
  const extraPhotos = profile.photos.slice(1);

  return (
    <Shell onBack={onBack} title={user.username} onBlock={onBlock ? () => onBlock(userId) : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={social.personHead}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={{ width: 132, height: 132, borderRadius: 66 }}
              resizeMode="cover"
              accessibilityLabel={`${user.name}'s photo`}
            />
          ) : (
            <Avatar user={user} size={120} />
          )}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={social.personName}>
              {user.name}
              {profile.age ? `, ${profile.age}` : ""}
            </Text>
            {profile.verified && (
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            )}
          </View>
          <Text style={social.personHandle}>@{user.username}</Text>

          {!!(profile.city || profile.profession) && (
            <Text style={social.rowSub}>
              {[profile.city, profile.profession].filter(Boolean).join("  ·  ")}
            </Text>
          )}

          {likeStatus !== "none" && (
            <View
              style={{
                marginTop: 8,
                paddingHorizontal: 11,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor:
                  likeStatus === "accepted" ? "#E6F4EE" : "#E6EDF5",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: likeStatus === "accepted" ? "#17624A" : "#1F4D7A",
                }}
              >
                {likeStatus === "accepted"
                  ? "Matched"
                  : likeStatus === "likes_you"
                    ? "Likes you"
                    : "Pending — waiting for them"}
              </Text>
            </View>
          )}
        </View>

        {!state.self && (
          <View style={social.personActions}>
            {likeStatus === "accepted" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Message ${user.username}`}
                onPress={() => onMessage(page)}
                style={social.personAction}
              >
                <Ionicons name="chatbubble" size={17} color={colors.textInverse} />
                <Text style={social.personActionText}>Message</Text>
              </Pressable>
            ) : likeStatus === "pending" ? (
              <View style={[social.personAction, social.personActionGhost]}>
                <Ionicons name="time-outline" size={17} color={colors.muted} />
                <Text style={[social.personActionText, social.personActionGhostText]}>
                  Pending
                </Text>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  likeStatus === "likes_you"
                    ? `Accept ${user.username} and open a chat`
                    : `Like ${user.username}`
                }
                disabled={busy}
                onPress={() => void like()}
                style={[social.personAction, busy && { opacity: 0.6 }]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="heart" size={17} color={colors.textInverse} />
                    <Text style={social.personActionText}>
                      {likeStatus === "likes_you" ? "Accept" : "Like"}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}

        {!!profile.about && (
          <View style={social.lockedCard}>
            <Text style={[social.lockedTitle, { marginBottom: 4 }]}>About</Text>
            <Text style={social.lockedBody}>{profile.about}</Text>
          </View>
        )}

        {profile.hobbies.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              paddingHorizontal: 20,
              marginTop: 14,
            }}
          >
            {profile.hobbies.map((hobby) => (
              <View
                key={hobby}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: colors.surface,
                }}
              >
                <Text style={{ fontSize: 13, color: colors.textSoft }}>{hobby}</Text>
              </View>
            ))}
          </View>
        )}

        {extraPhotos.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              paddingHorizontal: 20,
              marginTop: 16,
            }}
          >
            {extraPhotos.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ width: "31.5%", aspectRatio: 1, borderRadius: 12 }}
                resizeMode="cover"
              />
            ))}
          </View>
        )}

        {!state.self && likeStatus !== "accepted" && (
          <View style={social.lockedCard}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.primary} />
            <Text style={social.lockedTitle}>
              {page.messageBlockedReason === "blocked"
                ? "You cannot message this account"
                : "Chat opens on a match"}
            </Text>
            <Text style={social.lockedBody}>
              {page.messageBlockedReason === "blocked"
                ? "Messaging is unavailable between your accounts."
                : likeStatus === "pending"
                  ? `${user.username} has your like. The chat opens if they like you back.`
                  : likeStatus === "likes_you"
                    ? `${user.username} liked you. Accept and the chat opens for both of you.`
                    : `Like ${user.username}. If they like you back, the chat opens for both of you.`}
            </Text>
          </View>
        )}

        {!!error && (
          <Text accessibilityRole="alert" style={social.error}>
            {error}
          </Text>
        )}
      </ScrollView>
    </Shell>
  );
}

function Shell({
  children,
  onBack,
  title,
  onBlock,
}: {
  children: React.ReactNode;
  onBack: () => void;
  title: string;
  onBlock?: () => void;
}) {
  return (
    <View style={social.root}>
      <SafeAreaView style={social.safe}>
        <View style={social.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={onBack}
            style={social.back}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text numberOfLines={1} style={social.headerTitle}>
            {title}
          </Text>
          <View style={social.headerSpacer} />
          {onBlock && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Report or block"
              hitSlop={12}
              onPress={onBlock}
              style={social.back}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
            </Pressable>
          )}
        </View>
        {children}
      </SafeAreaView>
    </View>
  );
}
