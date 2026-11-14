import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { closeFriendsApi, type CloseFriendPerson } from "../../api/closeFriendsApi";
import { fonts, palette, radius } from "../../theme";
import { Avatar, Sheet } from "../posts/PostSheets";

/** Instagram's close-friends green. */
export const CLOSE_GREEN = "#1BAE58";

/**
 * Your Close friends list: tap someone to add or remove them. Only they see
 * the stories you share to Close friends, and nobody is told when you add
 * or remove them.
 */
export function CloseFriendsSheet({
  visible,
  accessToken,
  onClose,
  onCount,
}: {
  visible: boolean;
  accessToken: string;
  onClose: () => void;
  /** How many are on the list, after loading and after each change. */
  onCount?: (count: number) => void;
}) {
  const [people, setPeople] = useState<CloseFriendPerson[] | null>(null);
  const [error, setError] = useState("");
  const [words, setWords] = useState("");

  useEffect(() => {
    if (!visible) return;
    let live = true;
    setPeople(null);
    setError("");
    setWords("");
    closeFriendsApi
      .list(accessToken)
      .then((list) => {
        if (!live) return;
        setPeople(list);
        onCount?.(list.filter((p) => p.closeFriend).length);
      })
      .catch((e) => live && setError(e?.message || "Could not load your list."));
    return () => {
      live = false;
    };
    // onCount is a callback from the parent; loading again for it is not needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, accessToken]);

  const toggle = (userId: string) => {
    if (!people) return;
    const person = people.find((p) => p.user.userId === userId);
    if (!person) return;
    const next = !person.closeFriend;
    const update = (list: CloseFriendPerson[], close: boolean) =>
      list.map((p) => (p.user.userId === userId ? { ...p, closeFriend: close } : p));
    const changed = update(people, next);
    setPeople(changed);
    onCount?.(changed.filter((p) => p.closeFriend).length);
    closeFriendsApi.set(accessToken, userId, next).catch((e) => {
      setError(e?.message || "Could not change your list.");
      setPeople((list) => (list ? update(list, !next) : list));
    });
  };

  const shown = useMemo(() => {
    const term = words.trim().replace(/^@/, "").toLowerCase();
    if (!people) return [];
    if (!term) return people;
    return people.filter((p) => p.user.username.toLowerCase().includes(term) || p.user.name.toLowerCase().includes(term));
  }, [people, words]);
  const count = people?.filter((p) => p.closeFriend).length ?? 0;

  return (
    <Sheet visible={visible} title="Close friends" tall onClose={onClose}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 10 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: CLOSE_GREEN, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="star" size={18} color="#FFFFFF" />
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 13, color: palette.slate, lineHeight: 18 }}>
            Only these people see stories you share to Close friends. Nobody is told when you add or remove them.
          </Text>
        </View>
        <View style={{ padding: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: palette.paperSand, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 42 }}>
            <Ionicons name="search" size={18} color={palette.slate} />
            <TextInput
              value={words}
              onChangeText={setWords}
              placeholder="Search"
              placeholderTextColor={palette.slate}
              accessibilityLabel="Search people"
              autoCapitalize="none"
              style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: palette.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null) }}
            />
          </View>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.slate, marginTop: 10 }}>
            {count === 1 ? "1 person on your list" : `${count} people on your list`}
          </Text>
        </View>

        {!!error && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.crimson, paddingHorizontal: 16 }}>{error}</Text>}

        {people === null && !error ? (
          <ActivityIndicator color={palette.crimson} style={{ marginTop: 30 }} />
        ) : people && people.length === 0 ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate, textAlign: "center", padding: 24, lineHeight: 20 }}>
            Match with someone or follow people, and you can add them here.
          </Text>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            {shown.map((person) => (
              <Pressable
                key={person.user.userId}
                accessibilityRole="checkbox"
                accessibilityLabel={`${person.user.username}, ${person.closeFriend ? "on your Close friends list" : "not on your list"}`}
                accessibilityState={{ checked: person.closeFriend }}
                onPress={() => toggle(person.user.userId)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 9 }}
              >
                <Avatar person={person.user} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>
                    {person.user.name}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>
                    @{person.user.username}
                  </Text>
                </View>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: 2,
                    borderColor: person.closeFriend ? CLOSE_GREEN : palette.rule,
                    backgroundColor: person.closeFriend ? CLOSE_GREEN : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {person.closeFriend && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </Sheet>
  );
}
