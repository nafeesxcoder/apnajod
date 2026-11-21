import { useEffect, useState } from 'react';
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

export const AdminDashboardEnhanced = ({ accessToken }: { accessToken: string }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    newUsersToday: 0,
    verifiedCount: 0,
    totalMatches: 0,
    totalChats: 0,
    pendingVerifications: 0,
    pendingReports: 0,
  });

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
      }
    };
    loadMetrics();
  }, [accessToken]);

  const StatCard = ({ icon, label, value, change, color }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={[styles.iconBox, { backgroundColor: color }]}>
          <Ionicons name={icon} size={20} color={colors.textInverse} />
        </View>
        <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 12, color }]}>
          {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
        </Text>
      </View>
      <Text style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }]}>{label}</Text>
      <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 24, color: colors.text, marginTop: 8 }]}>
        {value.toLocaleString()}
      </Text>
    </View>
  );

  const ActionItem = ({ label, count, action, color }: any) => (
    <Pressable style={[styles.actionItem, { borderLeftColor: color }]} onPress={action}>
      <View style={{ flex: 1 }}>
        <Text style={[{ fontFamily: fonts.bodySemi, color: colors.text }]}>{label}</Text>
        <Text style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 }]}>
          {count} pending
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textInverse }]}>
          {count}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 28, color: colors.text }]}>Dashboard</Text>
          <Text style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }]}>
            {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.section}>
          <Text style={[{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, marginBottom: 12 }]}>
            Overview
          </Text>
          <View style={styles.metricsGrid}>
            <StatCard icon="people" label="Total Users" value={metrics.totalUsers} change={12} color={colors.primary} />
            <StatCard icon="star" label="New Today" value={metrics.newUsersToday} change={8} color={colors.accent} />
            <StatCard icon="checkmark-circle" label="Verified" value={metrics.verifiedCount} change={5} color={colors.success} />
            <StatCard icon="heart" label="Total Matches" value={metrics.totalMatches} change={15} color="#E91E63" />
          </View>
        </View>

        {/* Pending Actions */}
        <View style={styles.section}>
          <Text style={[{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, marginBottom: 12 }]}>
            Urgent Actions
          </Text>
          <ActionItem
            icon="document"
            label="Profile Verifications"
            count={metrics.pendingVerifications}
            color={colors.accent}
            action={() => {}}
          />
          <ActionItem
            icon="flag"
            label="Safety Reports"
            count={metrics.pendingReports}
            color={colors.danger}
            action={() => {}}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={[{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, marginBottom: 12 }]}>
            Engagement
          </Text>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[{ fontFamily: fonts.bodySemi, color: colors.text }]}>Total Chats</Text>
              <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 18, color: colors.primary }]}>
                {metrics.totalChats.toLocaleString()}
              </Text>
            </View>
            <View style={{ marginTop: 12, height: 4, backgroundColor: colors.line, borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ width: '65%', height: '100%', backgroundColor: colors.primary }} />
            </View>
          </View>
        </View>

        {/* Admin Actions */}
        <View style={styles.section}>
          <Text style={[{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, marginBottom: 12 }]}>
            Admin Tools
          </Text>
          <Pressable style={styles.adminBtn}>
            <Ionicons name="people" size={18} color={colors.textInverse} />
            <Text style={[{ fontFamily: fonts.bodySemi, color: colors.textInverse, flex: 1, marginLeft: 12 }]}>
              Manage Users
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textInverse} />
          </Pressable>
          <Pressable style={styles.adminBtn}>
            <Ionicons name="settings" size={18} color={colors.textInverse} />
            <Text style={[{ fontFamily: fonts.bodySemi, color: colors.textInverse, flex: 1, marginLeft: 12 }]}>
              System Settings
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textInverse} />
          </Pressable>
          <Pressable style={styles.adminBtn}>
            <Ionicons name="analytics" size={18} color={colors.textInverse} />
            <Text style={[{ fontFamily: fonts.bodySemi, color: colors.textInverse, flex: 1, marginLeft: 12 }]}>
              Analytics
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textInverse} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 0, paddingVertical: 16 },
  header: { paddingHorizontal: 16, marginBottom: 24 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  metricsGrid: { gap: 12 },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  iconBox: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statBox: { borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.line },
  adminBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    padding: 16,
    borderRadius: radius.md,
    marginBottom: 12,
    alignItems: 'center',
  },
});
