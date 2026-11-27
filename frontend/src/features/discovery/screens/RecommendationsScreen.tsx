import { useEffect, useState } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, palette} from '../../../theme';
import { matchApi } from '../../../api/matchApi';

export const RecommendationsScreen = ({ accessToken }: { accessToken: string }) => {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const data = await matchApi.getRecommendations(accessToken, 10);
        setProfiles(data || []);
      } catch (error) {
        console.error('Failed to load recommendations:', error);
      }
    };
    loadRecommendations();
  }, [accessToken]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView style={styles.container}>
        <Text style={[styles.title, { fontFamily: fonts.bodyBold }]}>सुझाव</Text>

        {profiles.map((profile: any) => (
          <Pressable key={profile.id} style={styles.card}>
            {profile.photoUrl && <Image source={{ uri: profile.photoUrl }} style={styles.photo} />}
            <View style={styles.content}>
              <Text style={[styles.name, { fontFamily: fonts.bodySemi }]}>
                {profile.firstName}, {profile.age}
              </Text>
              <Text style={[{ fontFamily: fonts.body }, { color: colors.muted }]}>📍 {profile.city}</Text>
              {profile.gunMilanScore > 0 && (
                <Text style={[{ fontFamily: fonts.bodySemi }, { color: colors.accent }]}>
                  Gun Milan: {profile.gunMilanScore}/36
                </Text>
              )}
              <Text style={[styles.about, { fontFamily: fonts.body }]}>{profile.about}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.actionBtn}>
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
              <Pressable style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(30,27,75,0.14)' }]}>
                <Ionicons name="heart" size={20} color={palette.navy} />
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 0, paddingVertical: 16 },
  title: { fontSize: 24, color: colors.text, paddingHorizontal: 16, marginBottom: 20 },
  card: { marginHorizontal: 16, marginBottom: 16, borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' },
  photo: { width: '100%', height: 240, backgroundColor: colors.line },
  content: { padding: 16, gap: 8 },
  name: { fontSize: 18, color: colors.text },
  about: { fontSize: 13, color: colors.muted, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, padding: 12, justifyContent: 'center' },
  actionBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2 },
});
