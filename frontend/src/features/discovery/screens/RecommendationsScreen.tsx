import { useEffect, useState } from "react";
import { View, ScrollView, Text, Pressable, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "../../../theme";
import { matchApi } from "../../../api/matchApi";
import type { Screen } from "../../../app/navigation/types";

export function RecommendationsScreen({
  accessToken,
  navigate,
  openDetail,
}: {
  accessToken: string;
  navigate: (s: Screen) => void;
  openDetail: (id: string) => void;
}) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await matchApi.getRecommendations(accessToken, 10);
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error("Failed to load recommendations:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accessToken]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Pressable onPress={() => navigate("Home" as Screen)}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[fonts.heading, { marginTop: 16, marginBottom: 20 }]}>
          आपके लिए सुझाए गए
        </Text>

        {recommendations.length === 0 ? (
          <Text style={[fonts.body, { color: colors.muted, textAlign: "center", marginTop: 40 }]}>
            अभी कोई सुझाव नहीं मिला। बाद में फिर से जांचें।
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {recommendations.map((profile) => (
              <Pressable
                key={profile.id}
                style={styles.card}
                onPress={() => openDetail(profile.id)}
              >
                <View style={{ gap: 12 }}>
                  {profile.photos[0] && (
                    <Image
                      source={{ uri: profile.photos[0] }}
                      style={{
                        width: "100%",
                        height: 300,
                        borderRadius: radius.small,
                        backgroundColor: colors.muted,
                      }}
                    />
                  )}
                  <View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={fonts.heading}>
                        {profile.name}, {profile.age}
                      </Text>
                      {profile.verified && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
                    </View>
                    <Text style={[fonts.caption, { color: colors.muted }]}>
                      📍 {profile.city}
                    </Text>
                    {profile.kundli && (
                      <Text style={[fonts.caption, { color: colors.accent, marginTop: 8 }]}>
                        🔮 गुण: {profile.kundli.score}/36
                      </Text>
                    )}
                    {profile.about && (
                      <Text style={[fonts.body, { marginTop: 8, color: colors.text }]} numberOfLines={2}>
                        {profile.about}
                      </Text>
                    )}
                  </View>
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
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    padding: 12,
    backgroundColor: colors.card,
  },
};
