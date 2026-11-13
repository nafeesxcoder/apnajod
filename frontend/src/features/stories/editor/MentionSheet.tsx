import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { socialApi, type SocialUser } from "../../../api/socialApi";
import { fonts, palette, radius } from "../../../theme";
import { Avatar, Sheet } from "../../posts/PostSheets";

/** Find someone to @mention: type at least two letters of their username. */
export function MentionSheet({
  visible,
  accessToken,
  onClose,
  onPick,
}: {
  visible: boolean;
  accessToken: string;
  onClose: () => void;
  onPick: (user: SocialUser) => void;
}) {
  const [words, setWords] = useState("");
  const [people, setPeople] = useState<SocialUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setWords("");
      setPeople([]);
    }
  }, [visible]);

  useEffect(() => {
    const term = words.trim().replace(/^@/, "");
    if (!visible || term.length < 2) {
      setPeople([]);
      return;
    }
    let live = true;
    setLoading(true);
    const timer = setTimeout(() => {
      socialApi
        .search(accessToken, term)
        .then((found) => live && setPeople(found))
        .catch(() => live && setPeople([]))
        .finally(() => live && setLoading(false));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [visible, words, accessToken]);

  return (
    <Sheet visible={visible} title="Mention someone" tall onClose={onClose}>
      <View style={{ flex: 1 }}>
        <View style={{ padding: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: palette.paperSand, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 42 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: palette.slate }}>@</Text>
            <TextInput
              autoFocus
              value={words}
              onChangeText={setWords}
              autoCapitalize="none"
              placeholder="Search username"
              placeholderTextColor={palette.slate}
              accessibilityLabel="Search username"
              style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: palette.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null) }}
            />
          </View>
        </View>
        <FlatList
          data={people}
          keyExtractor={(person) => person.userId}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={palette.crimson} style={{ marginTop: 20 }} />
            ) : (
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate, textAlign: "center", padding: 24 }}>
                {words.trim().length < 2 ? "Type a username to find someone." : "Nobody found."}
              </Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mention @${item.username}`}
              onPress={() => onPick(item)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 58 }}
            >
              <Avatar person={item} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>@{item.username}</Text>
                <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>{item.name}</Text>
              </View>
              <Ionicons name="add-circle-outline" size={22} color={palette.crimson} />
            </Pressable>
          )}
        />
      </View>
    </Sheet>
  );
}
