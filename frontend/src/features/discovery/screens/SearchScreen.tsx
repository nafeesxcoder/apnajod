import { useState } from "react";
import { View, ScrollView, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, typeScale } from "../../../theme";
import { matchApi } from "../../../api/matchApi";
import type { Screen } from "../../../app/navigation/types";

export function SearchScreen({
  accessToken,
  navigate,
  openDetail,
}: {
  accessToken: string;
  navigate: (s: Screen) => void;
  openDetail: (id: string) => void;
}) {
  const [filters, setFilters] = useState({
    minAge: 21,
    maxAge: 45,
    city: "",
    gender: "",
    verified: false,
    minKundliScore: 0,
  });

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await matchApi.search(accessToken, {
        minAge: filters.minAge,
        maxAge: filters.maxAge,
        city: filters.city || undefined,
        gender: filters.gender || undefined,
        verified: filters.verified || undefined,
        minKundliScore: filters.minKundliScore || undefined,
      });
      setResults(data.results || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <Pressable onPress={() => navigate("Home" as Screen)}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[fonts.heading, { marginTop: 16, marginBottom: 20 }]}>
          खोज करें
        </Text>

        {/* Filters */}
        <View style={{ gap: 16 }}>
          {/* Age Range */}
          <View>
            <Text style={[fonts.label, { marginBottom: 8 }]}>उम्र: {filters.minAge} - {filters.maxAge}</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="न्यूनतम"
                placeholderTextColor={colors.muted}
                value={String(filters.minAge)}
                onChangeText={(v) => setFilters({ ...filters, minAge: Number(v) || 21 })}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="अधिकतम"
                placeholderTextColor={colors.muted}
                value={String(filters.maxAge)}
                onChangeText={(v) => setFilters({ ...filters, maxAge: Number(v) || 45 })}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* City */}
          <View>
            <Text style={[fonts.label, { marginBottom: 8 }]}>शहर</Text>
            <TextInput
              style={styles.input}
              placeholder="शहर का नाम"
              placeholderTextColor={colors.muted}
              value={filters.city}
              onChangeText={(v) => setFilters({ ...filters, city: v })}
            />
          </View>

          {/* Gender */}
          <View>
            <Text style={[fonts.label, { marginBottom: 8 }]}>खोज रहे हैं</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["woman", "man", "everyone"].map((g) => (
                <Pressable
                  key={g}
                  style={[
                    styles.chip,
                    filters.gender === g && styles.chipActive,
                  ]}
                  onPress={() => setFilters({ ...filters, gender: filters.gender === g ? "" : g })}
                >
                  <Text
                    style={[
                      fonts.body,
                      { color: filters.gender === g ? colors.buttonText : colors.text },
                    ]}
                  >
                    {g === "woman" ? "महिला" : g === "man" ? "पुरुष" : "सभी"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Verified Only */}
          <Pressable
            style={[styles.chip, filters.verified && styles.chipActive]}
            onPress={() => setFilters({ ...filters, verified: !filters.verified })}
          >
            <Text style={[fonts.body, { color: colors.text }]}>
              {filters.verified ? "✓ " : ""}सत्यापित प्रोफाइल
            </Text>
          </Pressable>

          {/* Search Button */}
          <Pressable
            style={styles.button}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text style={[fonts.buttonText, { color: colors.buttonText }]}>
                खोज करें
              </Text>
            )}
          </Pressable>
        </View>

        {/* Results */}
        {results.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[fonts.label, { marginBottom: 12 }]}>
              {results.length} परिणाम मिले
            </Text>
            {results.map((profile) => (
              <Pressable
                key={profile.id}
                style={styles.resultCard}
                onPress={() => openDetail(profile.id)}
              >
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {profile.photos[0] && (
                    <View
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: radius.small,
                        backgroundColor: colors.muted,
                      }}
                    >
                      {/* Image goes here */}
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={fonts.body}>
                      {profile.name}, {profile.age}
                    </Text>
                    <Text style={[fonts.caption, { color: colors.muted }]}>
                      {profile.city}
                    </Text>
                    {profile.kundli && (
                      <Text style={[fonts.caption, { color: colors.accent }]}>
                        🔮 गुण: {profile.kundli.score}/36
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    padding: 12,
    color: colors.text,
    fontFamily: fonts.body.fontFamily,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.small,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  resultCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    marginBottom: 12,
  },
};
