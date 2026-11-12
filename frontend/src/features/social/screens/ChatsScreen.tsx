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
import { BottomNav, handleBottomNavScroll, useNavInset } from '../../../components/navigation/BottomNav';
import { CHAT_LIST_WIDTH, RAIL_WIDTH } from '../../../layout/breakpoints';
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

/**
 * The other person spoke last and is waiting. Shown so a reply does not
 * get buried - the same signal the "your turn" push is built on.
 */
function isYourTurn(conversation: ConversationSummary) {
  const message = conversation.lastMessage;
  return !!message && message.mine === false;
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
  pane,
  activeConversationId,
}: {
  pane?: boolean;
  activeConversationId?: string;
  onLoad: () => Promise<ConversationSummary[]>;
  onOpenConversation: (conversation: ConversationSummary) => void;
  onFind: () => void;
  navigate: (screen: Screen) => void;
}) {
  const navInset = useNavInset();
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

  // On a desktop with a conversation open, this list is not the screen -
  // it is the column beside it, the way every desktop messenger works.
  const paneStyle = pane
    ? {
        position: "absolute" as const,
        top: 0,
        bottom: 0,
        left: 0,
        width: RAIL_WIDTH + CHAT_LIST_WIDTH,
        borderRightWidth: 1,
        borderRightColor: "#D3D6DA",
        zIndex: 10,
      }
    : null;

  return (
    <View style={[social.root, paneStyle]}>
      <SafeAreaView
        style={[social.safe, { paddingLeft: navInset.paddingLeft }]}
      >
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
                  // Beside an open thread, the list has to say which one
                  // is open. Without it both panes are visible and neither
                  // tells you where you are.
                  style={[
                    social.row,
                    conversation.conversationId === activeConversationId && {
                      backgroundColor: "#EEF2F6",
                    },
                  ]}
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isYourTurn(conversation) && (
                          <View
                            accessibilityLabel="Your turn to reply"
                            style={{
                              backgroundColor: '#FDF0E1',
                              borderRadius: 999,
                              paddingHorizontal: 8,
                              paddingVertical: 1,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#9A5B00' }}>
                              Your turn
                            </Text>
                          </View>
                        )}
                        <Text numberOfLines={1} style={[social.rowSub, { flexShrink: 1 }]}>
                          {previewOf(conversation)}
                        </Text>
                      </View>
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
