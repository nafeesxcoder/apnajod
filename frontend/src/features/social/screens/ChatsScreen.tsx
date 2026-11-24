/**
 * The home of the app: the member's conversations.
 *
 * There is no deck and no curation here. People arrive by being found and
 * followed, so this screen is a list of threads and a way to start one.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { chatApi } from '../../../api/chatApi';
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
import { parseStickerPayload } from '../../../domain/chatMediaCatalog';
import { getChatSocket } from '../../../api/chatSocket';
import { onChatListChanged } from '../chatListBus';
import { archivedCount, listOrder } from "../chatListOrder";
import { BottomNav, handleBottomNavScroll, useNavInset } from '../../../components/navigation/BottomNav';
import { CHAT_LIST_WIDTH, RAIL_WIDTH } from '../../../layout/breakpoints';
import type { Screen } from '../../../app/navigation/types';
import { social } from '../../../theme/socialStyles';
import { colors, palette } from '../../../theme';
import { brand, whiteCard } from '../../../components/brand';
import { PressScale, Reveal, SpinRing } from '../../../components/motion';

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

/**
 * A sticker travels as a text payload ("✨STICKER|id|emoji|label|...").
 * Show the sticker, not the raw payload. A broken payload shows "Sticker".
 */
function stickerPreview(text: string): string | null {
  try {
    const sticker = parseStickerPayload(text);
    return sticker ? `${sticker.emoji} Sticker: ${sticker.label}` : null;
  } catch {
    return text.startsWith('✨STICKER|') ? 'Sticker' : null;
  }
}

function previewOf(conversation: ConversationSummary) {
  const message = conversation.lastMessage;
  if (!message) return 'Say hello';
  if (message.text) return stickerPreview(message.text) ?? message.text;
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
    case 'poll':
      return `📊 ${message.poll?.question ?? 'Poll'}`;
    case 'festival':
      return `✨ ${message.festival?.greeting ?? 'Festival wish'}`;
    case 'contact':
      return `👤 ${message.contact?.name ?? 'Contact'}`;
    case 'date':
      return `☕ ${message.date?.venue ?? 'Meet-up plan'}`;
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

/**
 * Photo in the navy/crimson ring. The ring turns while a reply is waiting
 * (unread, or their turn), so the chats that need you stand out.
 */
function Avatar({ name, url, waiting, online = false }: { name: string; url: string | null; waiting: boolean; online?: boolean }) {
  const size = 54;
  return (
    <View style={{ width: size, height: size }}>
    <SpinRing size={size} spin={waiting}>
      {url ? (
        <Image
          accessibilityLabel={`${name} profile photo`}
          source={{ uri: url }}
          style={[social.avatar, { width: '100%', height: '100%' }]}
        />
      ) : (
        <View
          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.paperSand }}
        >
          <Text style={[social.avatarInitial, { fontSize: size * 0.38 }]}>
            {(name || '?').trim().charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
    </SpinRing>
      {online && (
        <View
          accessibilityLabel="Online"
          style={{ position: 'absolute', right: 0, bottom: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: palette.emerald, borderWidth: 2, borderColor: '#FFFFFF' }}
        />
      )}
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
  accessToken,
}: {
  pane?: boolean;
  accessToken?: string;
  activeConversationId?: string;
  onLoad: () => Promise<ConversationSummary[]>;
  onOpenConversation: (conversation: ConversationSummary) => void;
  onFind: () => void;
  navigate: (screen: Screen) => void;
}) {
  const navInset = useNavInset();
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  // Green dots: who is online among the shown chats, checked every 30 seconds.
  const [onlineIds, setOnlineIds] = useState<Record<string, boolean>>({});
  const onlineKey = (items ?? []).map((c) => c.user.userId).join(",");
  useEffect(() => {
    if (!accessToken || !onlineKey) return;
    let live = true;
    const check = () =>
      chatApi
        .presenceFor(accessToken, onlineKey.split(","))
        .then((map) => live && setOnlineIds(map))
        .catch(() => undefined);
    void check();
    const timer = setInterval(check, 30_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [accessToken, onlineKey]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Archived chats sit in their own folder at the top of the list.
  const [showArchived, setShowArchived] = useState(false);

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

  // A chat with a new message (sent or received) moves to the top at once. The list
  // reloads when a message is sent or arrives, and every 10 seconds as a fallback
  // when the realtime connection is down. The server sorts it by the latest message.
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void loadRef.current(), 300);
    };
    const offBus = onChatListChanged(soon);
    const socket = getChatSocket();
    socket?.on('message:new', soon);
    socket?.on('message:update', soon);
    const poll = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void loadRef.current();
    }, 10000);
    return () => {
      offBus();
      socket?.off('message:new', soon);
      socket?.off('message:update', soon);
      clearInterval(poll);
      if (timer) clearTimeout(timer);
    };
  }, []);

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
              <>
              {/* Archived: tap to open the folder (or go back to your chats). */}
              {(showArchived || archivedCount(items) > 0) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showArchived ? "Back to chats" : `Archived chats, ${archivedCount(items)}`}
                  onPress={() => setShowArchived((v) => !v)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 }}
                >
                  <Ionicons name={showArchived ? 'arrow-back' : 'archive-outline'} size={20} color={colors.text} />
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.text }}>
                    {showArchived ? 'Archived chats' : 'Archived'}
                  </Text>
                  {!showArchived && (
                    <Text style={{ fontSize: 13, color: colors.muted }}>{archivedCount(items)}</Text>
                  )}
                </Pressable>
              )}
              {showArchived && archivedCount(items) === 0 && (
                <Text style={[social.emptyText, { textAlign: 'center', marginTop: 12 }]}>No archived chats.</Text>
              )}
              {listOrder(items, showArchived).map((conversation, index) => (
                <Reveal key={conversation.conversationId} delay={Math.min(index, 8) * 50}>
                <PressScale
                  scaleTo={0.985}
                  accessibilityRole="button"
                  accessibilityLabel={`Chat with ${conversation.user.name}${
                    conversation.unread ? `, ${conversation.unread} unread` : ''
                  }`}
                  onPress={() => onOpenConversation(conversation)}
                  // Beside an open thread, the list has to say which one
                  // is open. Without it both panes are visible and neither
                  // tells you where you are.
                  containerStyle={{ marginBottom: 10 }}
                  style={[
                    social.row,
                    {
                      ...whiteCard,
                      borderBottomWidth: 0,
                      paddingHorizontal: 12,
                    },
                    conversation.conversationId === activeConversationId && {
                      backgroundColor: "#EEF2F6",
                    },
                  ]}
                >
                  <View style={social.rowMain}>
                    <Avatar
                      name={conversation.user.name}
                      url={conversation.user.avatarUrl}
                      waiting={conversation.unread > 0 || isYourTurn(conversation)}
                      online={!!onlineIds[conversation.user.userId]}
                    />
                    <View style={social.rowText}>
                      <View style={social.rowTitleLine}>
                        <Text numberOfLines={1} style={social.rowTitle}>
                          {conversation.user.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {!!conversation.streak?.show && (
                            <Text
                              accessibilityLabel={
                                conversation.streak.atRisk
                                  ? `${conversation.streak.count} day streak, reply today to keep it`
                                  : `${conversation.streak.count} day streak`
                              }
                              style={{ fontSize: 12, fontWeight: '700', color: '#C2410C' }}
                            >
                              🔥 {conversation.streak.count}
                              {conversation.streak.atRisk ? ' ⏳' : ''}
                            </Text>
                          )}
                          {!!conversation.muted && (
                            <Ionicons accessibilityLabel="Muted" name="notifications-off-outline" size={13} color={colors.muted} />
                          )}
                          {!!conversation.pinned && !showArchived && (
                            <Ionicons accessibilityLabel="Pinned" name="pin" size={13} color={colors.muted} />
                          )}
                          <Text style={social.rowTime}>
                            {shortAge(conversation.lastAt)}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isYourTurn(conversation) && (
                          <View
                            accessibilityLabel="Your turn to reply"
                            style={{
                              backgroundColor: brand.pillBg,
                              borderRadius: 999,
                              paddingHorizontal: 8,
                              paddingVertical: 1,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: brand.pillText }}>
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
                </PressScale>
                </Reveal>
              ))}
              </>
            )}
          </ScrollView>
        )}
        <BottomNav active="chats" navigate={navigate} />
      </SafeAreaView>
    </View>
  );
}
