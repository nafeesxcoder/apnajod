import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, SafeAreaView, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../../../theme';
import { referralApi } from '../../../api/referralApi';

export const ReferralScreen = ({ accessToken }: { accessToken: string }) => {
  const [summary, setSummary] = useState({ joined: 0, boostsEarned: 0, pending: 0, monthlyCap: 0 });
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const summaryData = await referralApi.getSummary(accessToken);
        setSummary(summaryData);
        const linkData = await referralApi.getInviteLink(accessToken);
        setInviteLink(linkData.link);
      } catch (error) {
        console.error('Failed to load referral data:', error);
      }
    };
    loadData();
  }, [accessToken]);

  const handleShare = async () => {
    try {
      await Share.share({ message: `मेरे साथ Apnajoda पर जुड़ें: ${inviteLink}` });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView style={styles.container}>
        <Text style={[styles.title, { fontFamily: fonts.bodyBold }]}>आमंत्रण</Text>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 24 }]}>{summary.joined}</Text>
            <Text style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }]}>जुड़े हुए</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 24 }]}>{summary.boostsEarned}</Text>
            <Text style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }]}>बूस्ट अर्जित</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 24 }]}>{summary.pending}</Text>
            <Text style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }]}>लंबित</Text>
          </View>
        </View>

        {/* Share Button */}
        <Pressable style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-social" size={20} color={colors.textInverse} style={{ marginRight: 8 }} />
          <Text style={[{ fontFamily: fonts.bodySemi, color: colors.textInverse }]}>आमंत्रण साझा करें</Text>
        </Pressable>

        {/* Copy Link Button */}
        <Pressable style={styles.copyButton} onPress={() => {}}>
          <Text style={[{ fontFamily: fonts.bodySemi, color: colors.text }]}>लिंक कॉपी करें</Text>
        </Pressable>

        {/* How it Works */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoTitle, { fontFamily: fonts.bodySemi }]}>यह कैसे काम करता है</Text>
          <View style={styles.step}>
            <Text style={[{ fontFamily: fonts.bodyBold }]}>1️⃣</Text>
            <Text style={[{ fontFamily: fonts.body, color: colors.muted }]}>अपने दोस्तों को आमंत्रित करें</Text>
          </View>
          <View style={styles.step}>
            <Text style={[{ fontFamily: fonts.bodyBold }]}>2️⃣</Text>
            <Text style={[{ fontFamily: fonts.body, color: colors.muted }]}>वे साइन अप करते हैं</Text>
          </View>
          <View style={styles.step}>
            <Text style={[{ fontFamily: fonts.bodyBold }]}>3️⃣</Text>
            <Text style={[{ fontFamily: fonts.body, color: colors.muted }]}>आप बूस्ट अर्जित करते हैं!</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 0, paddingVertical: 16 },
  title: { fontSize: 24, color: colors.text, paddingHorizontal: 16, marginBottom: 20 },
  statsGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  shareButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, marginHorizontal: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  copyButton: { backgroundColor: colors.surface2, borderRadius: radius.md, paddingVertical: 12, marginHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  infoSection: { paddingHorizontal: 16, marginTop: 24 },
  infoTitle: { fontSize: 16, color: colors.text, marginBottom: 16 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
});
