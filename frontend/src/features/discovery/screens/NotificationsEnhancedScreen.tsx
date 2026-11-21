import { useEffect, useState } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../../theme';
import { matchApi } from '../../../api/matchApi';

type NotificationType = 'all' | 'likes' | 'matches';

export const NotificationsEnhancedScreen = ({ accessToken }: { accessToken: string }) => {
  const [activeTab, setActiveTab] = useState<NotificationType>('all');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await matchApi.getEnhancedNotifications(accessToken, activeTab);
        setNotifications(data || []);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };
    loadNotifications();
  }, [activeTab, accessToken]);

  const getIcon = (type: string) => {
    if (type === 'likes') return 'heart';
    if (type === 'matches') return 'flame';
    return 'notifications';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['all', 'likes', 'matches'] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[{ fontFamily: fonts.bodySemi, fontSize: 13 }, { color: activeTab === tab ? colors.accent : colors.muted }]}>
              {tab === 'all' ? 'सभी' : tab === 'likes' ? 'पसंद' : 'मैच'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.container}>
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off" size={40} color={colors.muted} />
            <Text style={[{ fontFamily: fonts.bodySemi, color: colors.muted }]}>कोई सूचनाएं नहीं</Text>
          </View>
        ) : (
          notifications.map((notif: any) => (
            <Pressable key={notif.id} style={styles.notifCard}>
              <View style={styles.iconContainer}>
                <Ionicons name={getIcon(notif.type)} size={20} color={colors.accent} />
              </View>
              <View style={styles.content}>
                <Text style={[styles.notifText, { fontFamily: fonts.bodySemi }]}>{notif.message}</Text>
                <Text style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }]}>{notif.timestamp}</Text>
              </View>
              {notif.read ? null : <View style={styles.unreadDot} />}
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.accent },
  container: { paddingHorizontal: 0, paddingVertical: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 200 },
  notifCard: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.lineSoft, alignItems: 'center', gap: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 4 },
  notifText: { fontSize: 14, color: colors.text },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
});
