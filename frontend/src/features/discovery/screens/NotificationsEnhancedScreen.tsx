import { useEffect, useState } from "react";
import { View, ScrollView, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "../../../theme";
import { matchApi } from "../../../api/matchApi";
import type { Screen } from "../../../app/navigation/types";

type NotificationType = "all" | "likes" | "matches";

export function NotificationsEnhancedScreen({
  accessToken,
  navigate,
  openDetail,
}: {
  accessToken: string;
  navigate: (s: Screen) => void;
  openDetail: (id: string) => void;
}) {
  const [notificationType, setNotificationType] = useState<NotificationType>("all");
  const [counts, setCounts] = useState<Record<NotificationType, number>>({ all: 0, likes: 0, matches: 0 });
  const [likes, setLikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [allData, likesData] = await Promise.all([
          matchApi.getEnhancedNotifications(accessToken, notificationType),
          matchApi.getIncomingLikes(accessToken),
        ]);
        setCounts({
          all: allData.count || 0,
          likes: allData.count || 0,
          matches: 0, // Would need separate API for matches
        });
        setLikes(likesData.likes || []);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accessToken, notificationType]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  const filterTabs: { label: string; value: NotificationType; count: number }[] = [
    { label: "सभी", value: "all", count: counts.all },
    { label: "लाइक्स", value: "likes", count: counts.likes },
    { label: "मैच", value: "matches", count: counts.matches },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Pressable onPress={() => navigate("Home" as Screen)}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <Text style={[fonts.heading, { marginTop: 16, marginBottom: 20 }]}>
          सूचनाएं
        </Text>

        {/* Filter Tabs */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {filterTabs.map((tab) => (
            <Pressable
              key={tab.value}
              style={[
                styles.tab,
                notificationType === tab.value && styles.tabActive,
              ]}
              onPress={() => setNotificationType(tab.value)}
            >
              <Text
                style={[
                  fonts.body,
                  {
                    color: notificationType === tab.value ? colors.buttonText : colors.text,
                  },
                ]}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={styles.badge}>
                  <Text style={[fonts.caption, { color: colors.buttonText, fontWeight: "bold" }]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Notifications List */}
        {likes.length === 0 ? (
          <Text style={[fonts.body, { color: colors.muted, textAlign: "center", marginTop: 40 }]}>
            अभी कोई सूचना नहीं
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {likes.slice(0, 20).map((like) => (
              <Pressable
                key={like.id}
                style={styles.notificationCard}
                onPress={() => openDetail(like.id)}
              >
                <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: colors.accent,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={like.spark ? "star" : "heart"}
                      size={24}
                      color={colors.buttonText}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={fonts.body}>
                      {like.name}, {like.age}
                    </Text>
                    <Text style={[fonts.caption, { color: colors.muted }]}>
                      {like.status === "pending"
                        ? "आपको पसंद किया"
                        : "मैच हो गया! 💕"}
                    </Text>
                    {like.spark && (
                      <Text style={[fonts.caption, { color: colors.accent }]}>
                        {like.spark.kind === "superlike" ? "⭐ Super Like" : "✨ Spark"}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.muted}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 8,
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  badge: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  notificationCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    backgroundColor: colors.card,
  },
};
