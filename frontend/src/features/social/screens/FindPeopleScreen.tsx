/**
 * Find people.
 *
 * Two ways in, because they suit different members: type a username, or let
 * the app check which of your contacts are already here. The contact list is
 * sent for the one request and nothing about it is kept.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import type { SocialUser } from "../../../api/socialApi";
import { colors } from "../../../theme";
import { social } from "../../../theme/socialStyles";

export type FindPeopleProps = {
  onBack: () => void;
  onSearch: (term: string) => Promise<SocialUser[]>;
  onMatchContacts: () => Promise<SocialUser[]>;
  onOpenPerson: (userId: string) => void;
  onFollow: (userId: string) => Promise<"accepted" | "pending">;
  /** Whether the device can hand us a contact list at all. */
  contactsSupported: boolean;
};

type Tab = "username" | "contacts";

export function FindPeopleScreen({
  onBack,
  onSearch,
  onMatchContacts,
  onOpenPerson,
  onFollow,
  contactsSupported,
}: FindPeopleProps) {
  const [tab, setTab] = useState<Tab>("username");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SocialUser[]>([]);
  const [contacts, setContacts] = useState<SocialUser[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const token = useRef(0);

  // Search as they type, but only once they have stopped: the endpoint is
  // rate limited and a keystroke is not a question.
  useEffect(() => {
    const q = term.trim();
    setError("");
    if (q.length < 2) {
      setResults([]);
      setBusy(false);
      return;
    }
    const mine = (token.current += 1);
    setBusy(true);
    const timer = setTimeout(() => {
      onSearch(q)
        .then((found) => {
          if (mine !== token.current) return;
          setResults(found);
        })
        .catch((e) => {
          if (mine !== token.current) return;
          setError(e instanceof Error ? e.message : "Search failed.");
          setResults([]);
        })
        .finally(() => {
          if (mine === token.current) setBusy(false);
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [term, onSearch]);

  const loadContacts = async () => {
    setError("");
    setBusy(true);
    try {
      setContacts(await onMatchContacts());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read your contacts.");
      setContacts([]);
    } finally {
      setBusy(false);
    }
  };

  const follow = async (user: SocialUser) => {
    setPending((p) => ({ ...p, [user.userId]: true }));
    try {
      const status = await onFollow(user.userId);
      const patch = (list: SocialUser[]) =>
        list.map((u) =>
          u.userId === user.userId
            ? { ...u, following: status === "accepted", requested: status === "pending" }
            : u,
        );
      setResults(patch);
      setContacts((c) => (c ? patch(c) : c));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not follow.");
    } finally {
      setPending((p) => ({ ...p, [user.userId]: false }));
    }
  };

  const shown = tab === "username" ? results : (contacts ?? []);
  const emptyMessage = useMemo(() => {
    if (busy) return "";
    if (tab === "username") {
      if (term.trim().length < 2) return "Type at least 2 letters of a username.";
      return `No one here goes by “${term.trim()}”.`;
    }
    if (contacts === null) return "";
    return "None of your contacts are on Milaan yet.";
  }, [busy, tab, term, contacts]);

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
          <Text style={social.headerTitle}>Find people</Text>
        </View>

        <View style={social.tabRow}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "username" }}
            onPress={() => setTab("username")}
            style={[social.tab, tab === "username" && social.tabOn]}
          >
            <Text style={[social.tabText, tab === "username" && social.tabTextOn]}>
              Username
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "contacts" }}
            onPress={() => {
              setTab("contacts");
              if (contacts === null && contactsSupported) void loadContacts();
            }}
            style={[social.tab, tab === "contacts" && social.tabOn]}
          >
            <Text style={[social.tabText, tab === "contacts" && social.tabTextOn]}>
              My contacts
            </Text>
          </Pressable>
        </View>

        {tab === "username" ? (
          <View style={social.searchBox}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              accessibilityLabel="Search by username"
              value={term}
              onChangeText={setTerm}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="riya_07"
              placeholderTextColor={colors.lineSoft}
              selectionColor={colors.accent}
              style={social.searchInput}
            />
            {!!term && (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear" onPress={() => setTerm("")} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>
        ) : (
          <View style={social.noteCard}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.accent} />
            <Text style={social.noteText}>
              {contactsSupported
                ? "Your contacts are checked once and never stored."
                : "Reading contacts is only available in the phone app."}
            </Text>
          </View>
        )}

        {!!error && (
          <Text accessibilityRole="alert" style={social.error}>
            {error}
          </Text>
        )}

        {busy ? (
          <View style={social.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : shown.length === 0 ? (
          <View style={social.center}>
            {tab === "contacts" && contacts === null && contactsSupported ? (
              <Pressable accessibilityRole="button" onPress={() => void loadContacts()} style={social.primaryButton}>
                <Text style={social.primaryButtonText}>Check my contacts</Text>
              </Pressable>
            ) : (
              <Text style={social.emptyText}>{emptyMessage}</Text>
            )}
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={social.listContent}
            showsVerticalScrollIndicator={false}
          >
            {shown.map((user) => (
              <PersonRow
                key={user.userId}
                user={user}
                busy={!!pending[user.userId]}
                onOpen={() => onOpenPerson(user.userId)}
                onFollow={() => void follow(user)}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

export function PersonRow({
  user,
  busy,
  onOpen,
  onFollow,
}: {
  user: SocialUser;
  busy?: boolean;
  onOpen: () => void;
  onFollow?: () => void;
}) {
  const label = user.following
    ? "Following"
    : user.requested
      ? "Requested"
      : "Follow";
  const settled = user.following || user.requested;
  return (
    <View style={social.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${user.username}`}
        onPress={onOpen}
        style={social.rowMain}
      >
        <Avatar user={user} />
        <View style={social.rowText}>
          <View style={social.rowTitleLine}>
            <Text numberOfLines={1} style={social.rowTitle}>
              {user.username}
            </Text>
            {user.isPrivate && (
              <Ionicons name="lock-closed" size={12} color={colors.muted} />
            )}
          </View>
          <Text numberOfLines={1} style={social.rowSub}>
            {user.followsYou ? `${user.name} · follows you` : user.name}
          </Text>
        </View>
      </Pressable>
      {onFollow && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} ${user.username}`}
          disabled={busy || settled}
          onPress={onFollow}
          style={[social.followButton, settled && social.followButtonOff]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Text style={[social.followButtonText, settled && social.followButtonTextOff]}>
              {label}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

export function Avatar({ user, size = 46 }: { user: { avatarUrl?: string | null; username: string }; size?: number }) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (user.avatarUrl) {
    return (
      <Image
        accessibilityLabel={`${user.username} profile photo`}
        source={{ uri: user.avatarUrl }}
        style={[social.avatar, dimension]}
      />
    );
  }
  return (
    <View style={[social.avatar, social.avatarEmpty, dimension]}>
      <Text style={[social.avatarInitial, { fontSize: size * 0.4 }]}>
        {(user.username || "?").slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
