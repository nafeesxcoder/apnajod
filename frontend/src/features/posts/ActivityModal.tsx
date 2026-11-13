import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { postApi, type ActivityItem } from "../../api/postApi";
import { fonts, palette } from "../../theme";
import { Avatar } from "./PostSheets";
import { timeAgo } from "./postFormat";
import { openPost, openProfile } from "./profileLink";

/**
 * Activity, like Instagram's heart: who liked or commented on your posts,
 * newest first, new ones marked. Opening it clears the dot on Home.
 * Tap a row to open the post; tap a photo or name to open that person.
 */
export function ActivityModal({
  visible,
  accessToken,
  onClose,
}: {
  visible: boolean;
  accessToken: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    let live = true;
    setItems(null);
    setError("");
    postApi
      .activity(accessToken)
      .then((result) => {
        if (!live) return;
        setItems(result.items);
        // Seen now: the dot goes. The "new" marks stay for this visit.
        if (result.unread > 0) void postApi.markActivitySeen(accessToken).catch(() => undefined);
      })
      .catch((e) => live && setError(e?.message || "Could not load activity."));
    return () => {
      live = false;
    };
  }, [visible, accessToken]);

  const leaveFor = (go: () => void) => {
    onClose();
    setTimeout(go, 80);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
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
            accessibilityLabel="Close activity"
            onPress={onClose}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="arrow-back" size={24} color={palette.ink} />
          </Pressable>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.bodyBold, fontSize: 18, color: palette.ink }}>
            Activity
          </Text>
        </View>

        {items === null && !error ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={palette.crimson} />
        ) : error ? (
          <Text style={{ textAlign: "center", color: palette.crimson, fontFamily: fonts.body, margin: 30 }}>{error}</Text>
        ) : items!.length === 0 ? (
          <View style={{ alignItems: "center", padding: 40, gap: 10 }}>
            <Ionicons name="heart-outline" size={40} color={palette.slate} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: palette.ink }}>No activity yet</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate, textAlign: "center", lineHeight: 19 }}>
              When someone likes or comments on your posts, you will see it here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items!}
            keyExtractor={(item, index) => `${item.kind}-${item.post.id}-${item.actor.userId}-${index}`}
            contentContainerStyle={{ paddingVertical: 6 }}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.actor.username} ${item.kind === "like" ? "liked your post" : `commented: ${item.body}`}. Open the post`}
                onPress={() => leaveFor(() => openPost(item.post.id))}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: item.isNew ? palette.crimsonTint : "transparent",
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open @${item.actor.username}`}
                  onPress={() => leaveFor(() => openProfile(item.actor.userId))}
                >
                  <Avatar person={item.actor} size={44} />
                </Pressable>
                <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: palette.ink, lineHeight: 20 }}>
                  <Text style={{ fontFamily: fonts.bodyBold }}>{item.actor.username}</Text>
                  {item.kind === "like" ? " liked your post." : ` commented: ${item.body}`}
                  <Text style={{ color: palette.slate }}> {timeAgo(item.at)}</Text>
                </Text>
                <Image
                  source={{ uri: item.post.mediaUrl }}
                  style={{ width: 46, height: 46, borderRadius: 6, backgroundColor: palette.paperSand }}
                />
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
