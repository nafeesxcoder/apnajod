/**
 * Someone else's page.
 *
 * The whole product sits on this screen's two decisions: whether you follow
 * them, and whether you may message them. A private account says so plainly
 * instead of letting someone type a message that would be refused.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
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
  onUnfollow,
  onMessage,
  onOpenFollowers,
  onOpenFollowing,
  onBlock,
}: {
  userId: string;
  onBack: () => void;
  onLoad: (userId: string) => Promise<PersonPage>;
  onFollow: (userId: string) => Promise<"accepted" | "pending">;
  onUnfollow: (userId: string) => Promise<void>;
  onMessage: (page: PersonPage) => void;
  onOpenFollowers: (userId: string) => void;
  onOpenFollowing: (userId: string) => void;
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

  const refresh = async () => {
    try {
      setPage(await onLoad(userId));
    } catch {
      /* leave the last good view on screen */
    }
  };

  const toggleFollow = async () => {
    if (!page) return;
    setBusy(true);
    try {
      if (page.state.following || page.state.requested) {
        await onUnfollow(userId);
      } else {
        await onFollow(userId);
      }
      await refresh();
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

  const { user, counts, state } = page;
  const followLabel = state.following
    ? "Liked"
    : state.requested
      ? "Liked"
      : "Like";

  return (
    <Shell onBack={onBack} title={user.username} onBlock={onBlock ? () => onBlock(userId) : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={social.personHead}>
          <Avatar user={user} size={96} />
          <Text style={social.personName}>{user.name}</Text>
          <Text style={social.personHandle}>@{user.username}</Text>
          {user.isPrivate && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="lock-closed" size={14} color={colors.muted} />
              <Text style={social.rowSub}>Private account</Text>
            </View>
          )}
          {state.followsYou && <Text style={social.rowSub}>Follows you</Text>}
        </View>

        <View style={[social.personMetaRow, { justifyContent: "center" }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${counts.followers} followers`}
            onPress={() => onOpenFollowers(userId)}
            style={social.personMeta}
          >
            <Text style={social.personMetaValue}>{counts.followers}</Text>
            <Text style={social.personMetaLabel}>Followers</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${counts.following} following`}
            onPress={() => onOpenFollowing(userId)}
            style={social.personMeta}
          >
            <Text style={social.personMetaValue}>{counts.following}</Text>
            <Text style={social.personMetaLabel}>Following</Text>
          </Pressable>
        </View>

        {!state.self && (
          <View style={social.personActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${followLabel} ${user.username}`}
              disabled={busy}
              onPress={() => void toggleFollow()}
              style={[
                social.personAction,
                (state.following || state.requested) && social.personActionGhost,
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text
                  style={[
                    social.personActionText,
                    (state.following || state.requested) && social.personActionGhostText,
                  ]}
                >
                  {followLabel}
                </Text>
              )}
            </Pressable>

            {page.canMessage && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Message ${user.username}`}
                onPress={() => onMessage(page)}
                style={[social.personAction, social.personActionGhost]}
              >
                <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
                <Text style={[social.personActionText, social.personActionGhostText]}>
                  Message
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {!state.self && !page.canMessage && (
          <View style={social.lockedCard}>
            <Ionicons name="lock-closed-outline" size={26} color={colors.accent} />
            <Text style={social.lockedTitle}>
              {page.messageBlockedReason === "blocked"
                ? "You cannot message this account"
                : "This account is private"}
            </Text>
            <Text style={social.lockedBody}>
              {page.messageBlockedReason === "blocked"
                ? "Messaging is unavailable between your accounts."
                : state.requested
                  ? `${user.username} has your like. The chat opens if they like you back.`
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
