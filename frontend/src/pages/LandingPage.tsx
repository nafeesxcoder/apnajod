import { View, ScrollView, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';

export function LandingPage() {

  const Feature = ({ icon, title, desc }: any) => (
    <View style={styles.featureCard}>
      <Ionicons name={icon} size={40} color={colors.accent} />
      <Text style={[styles.featureTitle, { fontFamily: fonts.bodySemi }]}>{title}</Text>
      <Text style={[styles.featureDesc, { fontFamily: fonts.body }]}>{desc}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView style={{ flex: 1 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { fontFamily: fonts.bodyBold }]}>Apnajoda</Text>
          <Text style={[styles.heroSubtitle, { fontFamily: fonts.bodySemi }]}>
            Find Your Perfect Match Based on Kundli
          </Text>
          <Pressable style={styles.ctaButton}>
            <Text style={[{ fontFamily: fonts.bodySemi, color: colors.textInverse }]}>Download App</Text>
          </Pressable>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: fonts.bodyBold }]}>Why Apnajoda?</Text>
          <View style={styles.featuresGrid}>
            <Feature icon="heart" title="Kundli Matching" desc="Gun Milan based compatibility" />
            <Feature icon="shield-checkmark" title="Verified Profiles" desc="Safe & secure dating" />
            <Feature icon="people" title="Smart Recommendations" desc="AI-powered matches" />
            <Feature icon="gamepad" title="Fun Games" desc="Know each other better" />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 24, color: colors.accent }]}>50K+</Text>
            <Text style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }]}>Users</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 24, color: colors.accent }]}>10K+</Text>
            <Text style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }]}>Matches</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 24, color: colors.accent }]}>4.8★</Text>
            <Text style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }]}>Rating</Text>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 20, color: colors.text, marginBottom: 16 }]}>
            Ready to Find Your Match?
          </Text>
          <Pressable style={styles.downloadBtn}>
            <Ionicons name="logo-google" size={20} color={colors.textInverse} />
            <Text style={[{ fontFamily: fonts.bodySemi, color: colors.textInverse, marginLeft: 8 }]}>
              Get on Google Play
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }]}>
            © 2026 Apnajoda. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 40,
    color: colors.textInverse,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: colors.textInverse,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: radius.md,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  sectionTitle: {
    fontSize: 24,
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  featureTitle: {
    fontSize: 16,
    color: colors.text,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 40,
    backgroundColor: colors.surface2,
  },
  stat: {
    alignItems: 'center',
  },
  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  downloadBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
