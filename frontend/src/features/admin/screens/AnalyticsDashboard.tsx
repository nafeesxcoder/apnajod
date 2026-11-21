import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../../../theme';

interface DashboardMetrics {
  totalUsers: number;
  newUsersToday: number;
  verifiedCount: number;
  totalMatches: number;
  totalChats: number;
  pendingVerifications: number;
  pendingReports: number;
}

export const AnalyticsDashboard = ({ accessToken }: { accessToken: string }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    newUsersToday: 0,
    verifiedCount: 0,
    totalMatches: 0,
    totalChats: 0,
    pendingVerifications: 0,
    pendingReports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await fetch('http://31.42.125.109:3000/admin/dashboard/overview', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();
        if (data.ok && data.overview) {
          setMetrics({
            totalUsers: data.overview.total_users || 0,
            newUsersToday: data.overview.new_users_today || 0,
            verifiedCount: data.overview.verified_users || 0,
            totalMatches: data.overview.total_matches || 0,
            totalChats: data.overview.total_chats || 0,
            pendingVerifications: data.overview.pending_verifications || 0,
            pendingReports: data.overview.pending_reports || 0,
          });
        }
      } catch (error) {
        console.error('Failed to load metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, [accessToken]);

  const MetricCard = ({ icon, label, value, color }: any) => (
    <View style={[styles.metricCard, { borderColor: color }]}>
      <View style={[styles.iconBox, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color={colors.textInverse} />
      </View>
      <Text style={[styles.metricLabel, { fontFamily: fonts.body }]}>{label}</Text>
      <Text style={[styles.metricValue, { fontFamily: fonts.bodyBold, color }]}>{value}</Text>
    </View>
  );

  const ActionCard = ({ icon, label, count, color }: any) => (
    <Pressable style={[styles.actionCard, { borderColor: color }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionLabel, { fontFamily: fonts.bodySemi }]}>{label}</Text>
        <Text style={[styles.actionValue, { fontFamily: fonts.bodyBold, color }]}>{count} pending</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={[{ fontFamily: fonts.bodyBold, color: colors.textInverse }]}>{count}</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView style={styles.container}>
        <Text style={[styles.title, { fontFamily: fonts.bodyBold }]}>📊 Analytics Dashboard</Text>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard icon="people" label="Total Users" value={metrics.totalUsers} color={colors.primary} />
          <MetricCard icon="star" label="New Today" value={metrics.newUsersToday} color={colors.accent} />
          <MetricCard icon="checkmark-circle" label="Verified" value={metrics.verifiedCount} color={colors.success} />
          <MetricCard icon="heart" label="Matches" value={metrics.totalMatches} color={colors.romance} />
        </View>

        {/* Secondary Metrics */}
        <View style={styles.metricsGrid}>
          <MetricCard icon="chatbubble" label="Chats" value={metrics.totalChats} color={colors.primary} />
        </View>

        {/* Pending Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: fonts.bodySemi }]}>⚠️ Pending Actions</Text>
          <ActionCard
            icon="document"
            label="Profile Verifications"
            count={metrics.pendingVerifications}
            color={colors.accent}
          />
          <ActionCard icon="flag" label="Safety Reports" count={metrics.pendingReports} color={colors.danger} />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: fonts.bodySemi }]}>⚡ Quick Actions</Text>
          <Pressable style={styles.actionButton}>
            <Ionicons name="checkmark-done" size={18} color={colors.textInverse} />
            <Text style={[{ fontFamily: fonts.bodySemi, color: colors.textInverse, marginLeft: 8 }]}>Review Verifications</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.danger }]}>
            <Ionicons name="alert-circle" size={18} color={colors.textInverse} />
            <Text style={[{ fontFamily: fonts.bodySemi, color: colors.textInverse, marginLeft: 8 }]}>Review Reports</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 0, paddingVertical: 16 },
  title: { fontSize: 24, color: colors.text, paddingHorizontal: 16, marginBottom: 20 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 20 },
  metricCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  metricLabel: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  metricValue: { fontSize: 20 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 16, color: colors.text, marginBottom: 12 },
  actionCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionLabel: { fontSize: 14, color: colors.text },
  actionValue: { fontSize: 12, color: colors.muted, marginTop: 4 },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
});
