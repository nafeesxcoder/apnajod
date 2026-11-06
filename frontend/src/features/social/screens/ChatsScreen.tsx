/**
 * The home of the app: the member's conversations.
 *
 * There is no deck and no curation here. People arrive by being found and
 * followed, so this screen is a list of threads and a way to start one.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ConversationSummary } from '../../../api/chatApi';
import { BottomNav, handleBottomNavScroll } from '../../../components/navigation/BottomNav';
import type { Screen } from '../../../app/navigation/types';
import { social } from '../../../theme/socialStyles';
import { colors } from '../../../theme';

/** "now", "4m", "3h", "2d" — enough to place a message without a clock. */
function shortAge(ms: number) {
  if (!ms) return '';
  const secs = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (secs < 60) return 'now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

function previewOf(conversation: ConversationSummary) {
  const message = conversation.lastMessage;
  if (!message) return 'Say hello';
  if (message.text) return message.text;
  switch (message.type) {
    case 'image':
      return 'Photo';
    case 'gif':
      return 'GIF';
    case 'sticker':
      return 'Sticker';
    case 'voice':
      return 'Voice note';
    case 'document':
      return 'Document';
    case 'location':
      return 'Location';
    default:
      return 'Message';
  }
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const size = 52;
  if (url) {
    return (
      <Image
        accessibilityLabel={`${name} profile photo`}
        source={{ uri: url }}
        style={[social.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }
  return (
    <View
      style={[
        social.avatarEmpty,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[social.avatarInitial, { fontSize: size * 0.4 }]}>
        {(name || '?').trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function ChatsScreen({
  onLoad,
  onOpenConversation,
  onFind,
  navigate,
}: {
  onLoad: () => Promise<ConversationSummary[]>;
  onOpenConversation: (conversation: ConversationSummary) => void;
  onFind: () => void;
  navigate: (screen: Screen) => void;
}) {
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await onLoad());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your chats.');
      setItems([]);
    }
  }, [onLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={social.root}>
      <SafeAreaView style={social.safe}>
        <View style={social.header}>
          <Text style={social.headerTitle}>Chats</Text>
          <View style={social.headerSpacer} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Find people"
            hitSlop={10}
            onPress={onFind}
            style={social.back}
          >
            <Ionicons name="search" size={20} color={colors.text} />
          </Pressable>
        </View>

        {items === null ? (
          <View style={social.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <ScrollView
            onScroll={handleBottomNavScroll}
            scrollEventThrottle={16}
            contentContainerStyle={social.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
            }
          >
            {!!error && <Text style={social.error}>{error}</Text>}

            {items.length === 0 && !error ? (
              <View style={social.emptyBlock}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={44}
                  color={colors.accentSoft}
                />
                <Text style={social.emptyTitle}>No chats yet</Text>
                <Text style={social.emptyText}>
                  Find someone by their username and say hello.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Find people"
                  onPress={onFind}
                  style={social.primaryButton}
                >
                  <Text style={social.primaryButtonText}>Find people</Text>
                </Pressable>
              </View>
            ) : (
              items.map((conversation) => (
                <Pressable
                  key={conversation.conversationId}
                  accessibilityRole="button"
                  accessibilityLabel={`Chat with ${conversation.user.name}${
                    conversation.unread ? `, ${conversation.unread} unread` : ''
                  }`}
                  onPress={() => onOpenConversation(conversation)}
                  style={social.row}
                >
                  <View style={social.rowMain}>
                    <Avatar
                      name={conversation.user.name}
                      url={conversation.user.avatarUrl}
                    />
                    <View style={social.rowText}>
                      <View style={social.rowTitleLine}>
                        <Text numberOfLines={1} style={social.rowTitle}>
                          {conversation.user.name}
                        </Text>
                        <Text style={social.rowTime}>
                          {shortAge(conversation.lastAt)}
                        </Text>
                      </View>
                      <Text numberOfLines={1} style={social.rowSub}>
                        {previewOf(conversation)}
                      </Text>
                    </View>
                    {conversation.unread > 0 && (
                      <View style={social.unreadDot}>
                        <Text style={social.unreadDotText}>
                          {conversation.unread > 9 ? '9+' : conversation.unread}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        )}
        <BottomNav active="chats" navigate={navigate} />
      </SafeAreaView>
    </View>
  );
}
