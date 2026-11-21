import { useState } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { colors, fonts, radius } from '../../../theme';
import { matchApi } from '../../../api/matchApi';

export const SearchScreen = ({ accessToken }: { accessToken: string }) => {
  const [filters, setFilters] = useState({ minAge: 18, maxAge: 40, city: '', gender: '', verified: false, minKundliScore: 0 });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await matchApi.search(accessToken, filters);
      setResults(data || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView style={styles.container}>
        <Text style={[styles.title, { fontFamily: fonts.bodyBold }]}>खोज करें</Text>

        {/* Age Range */}
        <View style={styles.section}>
          <Text style={[styles.label, { fontFamily: fonts.bodySemi }]}>उम्र: {filters.minAge} - {filters.maxAge}</Text>
          <View style={styles.inputRow}>
            <Text style={{ color: colors.muted }}>Min</Text>
            <Pressable style={styles.ageInput} onPress={() => setFilters({ ...filters, minAge: Math.max(18, filters.minAge - 1) })}>
              <Text style={{ color: colors.text }}>−</Text>
            </Pressable>
            <Text style={{ color: colors.text }}>{filters.minAge}</Text>
            <Pressable style={styles.ageInput} onPress={() => setFilters({ ...filters, minAge: filters.minAge + 1 })}>
              <Text style={{ color: colors.text }}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* City */}
        <View style={styles.section}>
          <Text style={[styles.label, { fontFamily: fonts.bodySemi }]}>शहर</Text>
          <Pressable style={styles.input} onPress={() => {}}>
            <Text style={{ color: filters.city ? colors.text : colors.muted }}>
              {filters.city || 'शहर चुनें'}
            </Text>
          </Pressable>
        </View>

        {/* Gender */}
        <View style={styles.section}>
          <Text style={[styles.label, { fontFamily: fonts.bodySemi }]}>खोज रहे हैं</Text>
          <View style={styles.genderRow}>
            {['महिला', 'पुरुष', 'अन्य'].map((g) => (
              <Pressable
                key={g}
                style={[styles.chip, filters.gender === g && styles.chipActive]}
                onPress={() => setFilters({ ...filters, gender: g })}
              >
                <Text style={[{ fontFamily: fonts.bodySemi, fontSize: 12 }, { color: filters.gender === g ? colors.textInverse : colors.text }]}>
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Verified */}
        <Pressable style={[styles.chip, filters.verified && styles.chipActive]} onPress={() => setFilters({ ...filters, verified: !filters.verified })}>
          <Text style={[{ fontFamily: fonts.bodySemi }, { color: filters.verified ? colors.textInverse : colors.text }]}>✓ सत्यापित केवल</Text>
        </Pressable>

        {/* Search Button */}
        <Pressable style={styles.button} onPress={handleSearch}>
          {loading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={[{ fontFamily: fonts.bodySemi, color: colors.textInverse }]}>खोजें</Text>
          )}
        </Pressable>

        {/* Results */}
        <View style={styles.results}>
          <Text style={[styles.resultTitle, { fontFamily: fonts.bodySemi }]}>परिणाम ({results.length})</Text>
          {results.map((profile: any) => (
            <Pressable key={profile.id} style={styles.card}>
              <Text style={[{ fontFamily: fonts.bodySemi }, { color: colors.text }]}>{profile.firstName}</Text>
              <Text style={[{ fontFamily: fonts.body }, { color: colors.muted }]}>{profile.age}, {profile.city}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 0, paddingVertical: 16 },
  title: { fontSize: 24, color: colors.text, paddingHorizontal: 16, marginBottom: 20 },
  section: { paddingHorizontal: 16, marginBottom: 16, gap: 10 },
  label: { fontSize: 13, color: colors.text },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ageInput: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, backgroundColor: colors.surface },
  genderRow: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  button: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, marginHorizontal: 16, alignItems: 'center', marginTop: 20 },
  results: { paddingHorizontal: 16, marginTop: 24 },
  resultTitle: { fontSize: 16, color: colors.text, marginBottom: 12 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, marginBottom: 12, backgroundColor: colors.surface },
});
