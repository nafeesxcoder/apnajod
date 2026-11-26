/**
 * The home of the app: the member's conversations, laid out the way the
 * messaging apps people already use lay them out: a search bar on top, plain
 * rows (photo, name, last message, time, unread count), and a round button to
 * find people to start a chat with. Nothing moves on its own except when the
 * list really changes, so scrolling stays smooth.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { chatApi } from '../../../api/chatApi';
import type { ConversationSummary } from '../../../api/chatApi';
import { parseStickerPayload } from '../../../domain/chatMediaCatalog';
import { getChatSocket } from '../../../api/chatSocket';
import { onChatListChanged } from '../chatListBus';
import { archivedCount, listOrder } from '../chatListOrder';
import { BottomNav, handleBottomNavScroll, useNavInset } from '../../../components/navigation/BottomNav';
import { CHAT_LIST_WIDTH, RAIL_WIDTH } from '../../../layout/breakpoints';
import { useLayout } from '../../../layout/useLayout';
import type { Screen } from '../../../app/navigation/types';
import { Modal } from '../../../components/BackModal';
import { palette } from '../../../theme';

const ROW_HEIGHT = 76;
const AVATAR = 52;
const MUTED = '#667781';

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
      return message.document?.name ? `📄 ${message.document.name}` : 'Document';
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

/** The other person spoke last and is waiting for a reply. */
function isYourTurn(conversation: ConversationSummary) {
  const message = conversation.lastMessage;
  return !!message && message.mine === false;
}

/** Same chats, same order, same details: then the list is not redrawn. */
function sameList(a: ConversationSummary[], b: ConversationSummary[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.conversationId !== y.conversationId ||
      x.lastAt !== y.lastAt ||
      x.unread !== y.unread ||
      !!x.pinned !== !!y.pinned ||
      !!x.archived !== !!y.archived ||
      !!x.muted !== !!y.muted ||
      x.user.name !== y.user.name ||
      x.user.avatarUrl !== y.user.avatarUrl ||
      x.lastMessage?.id !== y.lastMessage?.id ||
      x.lastMessage?.text !== y.lastMessage?.text
    ) {
      return false;
    }
  }
  return true;
}

function Avatar({ name, url, online, waiting }: { name: string; url: string | null; online: boolean; waiting: boolean }) {
  return (
    <View style={[styles.avatarRing, waiting && styles.avatarRingOn]}>
      {url ? (
        <Image
          accessibilityLabel={`${name} profile photo`}
          source={{ uri: url }}
          style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 }}
        />
      ) : (
        <View style={styles.initialBox}>
          <Text style={styles.initial}>{(name || '?').trim().charAt(0).toUpperCase()}</Text>
        </View>
      )}
      {online && <View accessibilityLabel="Online" style={styles.online} />}
    </View>
  );
}

const ChatRow = function ChatRow({
  conversation,
  active,
  online,
  waiting,
  pinned,
  onPress,
}: {
  conversation: ConversationSummary;
  active: boolean;
  online: boolean;
  waiting: boolean;
  pinned: boolean;
  onPress: () => void;
}) {
  const unread = conversation.unread > 0;
  const yourTurn = unread && isYourTurn(conversation);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${conversation.user.name}${unread ? `, ${conversation.unread} unread` : ''}`}
      onPress={onPress}
      android_ripple={{ color: 'rgba(31,77,122,0.08)' }}
      style={[styles.row, active && styles.rowActive]}
    >
      <Avatar name={conversation.user.name} url={conversation.user.avatarUrl} online={online} waiting={waiting} />
      <View style={styles.middle}>
        <View style={styles.nameLine}>
          <Text numberOfLines={1} style={[styles.name, unread && styles.nameUnread]}>
            {conversation.user.name}
          </Text>
          {!!conversation.streak?.show && (
            <Text
              accessibilityLabel={
                conversation.streak.atRisk
                  ? `${conversation.streak.count} day streak, reply today to keep it`
                  : `${conversation.streak.count} day streak`
              }
              style={styles.streak}
            >
              🔥 {conversation.streak.count}
              {conversation.streak.atRisk ? ' ⏳' : ''}
            </Text>
          )}
        </View>
        <Text numberOfLines={1} style={[styles.preview, (unread || yourTurn) && styles.previewUnread]}>
          {yourTurn && (
            <Text accessibilityLabel="Your turn to reply" style={styles.yourTurn}>
              Your turn ·{' '}
            </Text>
          )}
          {previewOf(conversation)}
        </Text>
      </View>
      <View style={styles.side}>
        <Text style={[styles.time, unread && styles.timeUnread]}>{shortAge(conversation.lastAt)}</Text>
        <View style={styles.badges}>
          {!!conversation.muted && <Ionicons name="notifications-off" size={14} color={MUTED} accessibilityLabel="Muted" />}
          {pinned && <Ionicons name="pin" size={14} color={palette.navy} accessibilityLabel="Pinned" />}
          {unread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conversation.unread > 9 ? '9+' : conversation.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

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
  const { isWide } = useLayout();
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Archived chats sit in their own folder at the top of the list.
  const [showArchived, setShowArchived] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Green dots: who is online among the shown chats, checked every 30 seconds.
  const [onlineIds, setOnlineIds] = useState<Record<string, boolean>>({});
  const onlineKey = (items ?? []).map((c) => c.user.userId).join(',');
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

  const load = useCallback(async () => {
    setError('');
    try {
      const next = await onLoad();
      // Only a real change redraws the list; an unchanged poll does nothing.
      setItems((current) => (current && sameList(current, next) ? current : next));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your chats.');
      setItems((current) => current ?? []);
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

  // The rows on screen: the chosen folder, in order, filtered by the search.
  const rows = useMemo(() => {
    const ordered = listOrder(items ?? [], showArchived);
    const needle = query.trim().toLowerCase();
    if (!needle) return ordered;
    return ordered.filter(
      (c) =>
        c.user.name.toLowerCase().includes(needle) ||
        (c.user.username ?? '').toLowerCase().includes(needle) ||
        previewOf(c).toLowerCase().includes(needle),
    );
  }, [items, showArchived, query]);

  // On a desktop with a conversation open, this list is the column beside it.
  const paneStyle = pane
    ? {
        position: 'absolute' as const,
        top: 0,
        bottom: 0,
        left: 0,
        width: RAIL_WIDTH + CHAT_LIST_WIDTH,
        borderRightWidth: 1,
        borderRightColor: palette.rule,
        zIndex: 10,
      }
    : null;

  const archived = archivedCount(items ?? []);
  const header = (
    <View>
      <View style={[styles.titleRow, styles.titleBar]}>
        <Text style={styles.title}>Chats</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chat list options"
          hitSlop={8}
          onPress={() => setMenuOpen(true)}
          style={styles.moreButton}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={palette.ink} />
        </Pressable>
      </View>
      {menuOpen && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close chat list options"
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
            onPress={() => setMenuOpen(false)}
          />
          <View style={styles.menuSheet}>
            <View style={styles.menuHandle} />
            {(
              [
                { label: 'Archived chats', icon: 'archive-outline', run: () => setShowArchived(true) },
                { label: 'Notifications', icon: 'notifications-outline', run: () => navigate('likes') },
                { label: 'Find people', icon: 'search-outline', run: () => onFind() },
                { label: 'Settings', icon: 'settings-outline', run: () => navigate('settings') },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => {
                  setMenuOpen(false);
                  item.run();
                }}
                style={styles.menuRow}
              >
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={palette.ink} />
                <Text style={styles.menuText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Modal>
      )}
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={MUTED} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search chats"
            placeholderTextColor={MUTED}
            accessibilityLabel="Search chats"
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
          />
          {!!query && (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={MUTED} />
            </Pressable>
          )}
        </View>
      </View>
      {(showArchived || archived > 0) && !query && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showArchived ? 'Back to chats' : `Archived chats, ${archived}`}
          onPress={() => setShowArchived((v) => !v)}
          style={styles.folder}
        >
          <View style={styles.folderIcon}>
            <Ionicons name={showArchived ? 'arrow-back' : 'archive-outline'} size={20} color={palette.navy} />
          </View>
          <Text style={styles.folderText}>{showArchived ? 'Archived chats' : 'Archived'}</Text>
          {!showArchived && <Text style={styles.folderCount}>{archived}</Text>}
        </Pressable>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  const empty =
    items === null ? null : query ? (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No chats match “{query.trim()}”.</Text>
        <Pressable accessibilityRole="button" onPress={onFind} style={styles.emptyButton}>
          <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Find “{query.trim()}” on Apnajoda</Text>
        </Pressable>
      </View>
    ) : showArchived ? (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No archived chats.</Text>
      </View>
    ) : (
      <View style={styles.empty}>
        <Ionicons name="chatbubbles-outline" size={44} color={palette.navySoft} />
        <Text style={styles.emptyTitle}>No chats yet</Text>
        <Text style={styles.emptyText}>Find someone by their username and say hello.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Find people" onPress={onFind} style={styles.emptyButton}>
          <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Find people</Text>
        </Pressable>
      </View>
    );

  return (
    <View style={[styles.root, paneStyle]}>
      <SafeAreaView style={[styles.safe, { paddingLeft: navInset.paddingLeft }]}>
        {items === null ? (
          <>
            {header}
            <View style={styles.loading}>
              <ActivityIndicator color={palette.navy} />
            </View>
          </>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.conversationId}
            renderItem={({ item: conversation }) => (
              <ChatRow
                conversation={conversation}
                active={conversation.conversationId === activeConversationId}
                online={!!onlineIds[conversation.user.userId]}
                waiting={conversation.unread > 0 || isYourTurn(conversation)}
                pinned={!!conversation.pinned && !showArchived}
                onPress={() => onOpenConversation(conversation)}
              />
            )}
            ListHeaderComponent={header}
            ListEmptyComponent={empty}
            initialNumToRender={12}
            windowSize={7}
            maxToRenderPerBatch={10}
            onScroll={handleBottomNavScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 150 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Find people to chat with"
          onPress={onFind}
          style={[styles.fab, { bottom: isWide ? 28 : 100 }]}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </Pressable>

        <BottomNav active="chats" navigate={navigate} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safe: {
    flex: 1,
  },
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: palette.ink,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuSheet: {
    backgroundColor: palette.paper,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  menuHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.rule,
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  menuText: {
    fontSize: 16,
    color: palette.ink,
  },
  searchWrap: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    backgroundColor: '#F0F2F5',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: palette.ink,
    paddingVertical: 0,
  },
  folder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  folderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.paperSand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: palette.ink,
  },
  folderCount: {
    fontSize: 13,
    color: MUTED,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  rowActive: {
    backgroundColor: '#F0F2F5',
  },
  middle: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streak: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  avatarRing: {
    width: AVATAR + 6,
    height: AVATAR + 6,
    borderRadius: (AVATAR + 6) / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingOn: {
    borderColor: palette.navy,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.ink,
  },
  nameUnread: {
    fontWeight: '700',
  },
  preview: {
    fontSize: 14,
    color: MUTED,
  },
  previewUnread: {
    color: palette.ink,
    fontWeight: '600',
  },
  yourTurn: {
    color: palette.crimson,
    fontWeight: '700',
  },
  side: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 48,
  },
  time: {
    fontSize: 12,
    color: MUTED,
  },
  timeUnread: {
    color: palette.navy,
    fontWeight: '700',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 20,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: palette.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  initialBox: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: palette.paperSand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: AVATAR * 0.4,
    fontWeight: '700',
    color: palette.navy,
  },
  online: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: palette.emerald,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  loading: {
    paddingTop: 40,
    alignItems: 'center',
  },
  error: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: palette.crimson,
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.ink,
  },
  emptyText: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: palette.navy,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.crimson,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
