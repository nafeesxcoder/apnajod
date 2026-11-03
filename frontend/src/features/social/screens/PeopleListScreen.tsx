/**
 * A followers or following list, for your own account or someone else's.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import type { SocialUser } from "../../../api/socialApi";
import { colors } from "../../../theme";
import { social } from "../../../theme/socialStyles";
import { PersonRow } from "./FindPeopleScreen";

export function PeopleListScreen({
  title,
  onBack,
  onLoad,
  onOpenPerson,
  onFollow,
  emptyMessage,
}: {
  title: string;
  onBack: () => void;
  onLoad: () => Promise<SocialUser[]>;
  onOpenPerson: (userId: string) => void;
  onFollow: (userId: string) => Promise<"accepted" | "pending">;
  emptyMessage: string;
}) {
  const [users, setUsers] = useState<SocialUser[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    setUsers(null);
    onLoad()
      .then((u) => active && setUsers(u))
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load this list.");
        setUsers([]);
      });
    return () => {
      active = false;
    };
  }, [onLoad]);

  const follow = async (user: SocialUser) => {
    setBusy((b) => ({ ...b, [user.userId]: true }));
    try {
      const status = await onFollow(user.userId);
      setUsers((list) =>
        (list ?? []).map((u) =>
          u.userId === user.userId
            ? { ...u, following: status === "accepted", requested: status === "pending" }
            : u,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not follow.");
    } finally {
      setBusy((b) => ({ ...b, [user.userId]: false }));
    }
  };

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
          <Text style={social.headerTitle}>{title}</Text>
        </View>

        {!!error && (
          <Text accessibilityRole="alert" style={social.error}>
            {error}
          </Text>
        )}

        {users === null ? (
          <View style={social.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : users.length === 0 ? (
          <View style={social.center}>
            <Text style={social.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={social.listContent} showsVerticalScrollIndicator={false}>
            {users.map((user) => (
              <PersonRow
                key={user.userId}
                user={user}
                busy={!!busy[user.userId]}
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
