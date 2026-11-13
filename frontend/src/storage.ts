import AsyncStorage from '@react-native-async-storage/async-storage';

export type DatePlanStatus = 'proposed' | 'accepted' | 'declined' | 'countered' | 'completed' | 'cancelled' | 'no_show' | 'unresponsive';
export type OnboardingResumeScreen =
  | 'welcome' | 'signup' | 'login' | 'forgotPassword' | 'quickProfile'
  | 'modeSelect' | 'coupleSetup' | 'profileSetup' | 'vibes' | 'intent' | 'alignment';
export type RelationshipReflectionChoice = 'continue' | 'pause' | 'close';
export type RelationshipReflectionRecord = {
  choice: RelationshipReflectionChoice;
  dateMessageId: string;
  dateProposalId?: string;
  useForMatching: boolean;
  createdAt: number;
  updatedAt: number;
};

export type RelationshipReminderRecord = {
  enabled: boolean;
  dateMessageId: string;
  dateProposalId?: string;
  scheduledFor?: string;
  updatedAt: number;
};

const STORAGE_KEY = '@milaan/app_state/v2';
const LEGACY_STORAGE_KEYS = ['@milaan/app_state/v1', '@mi_amore/app_state/v1'];

export type ChatMessage = {
  id: string;
  senderId?: string;
  mine?: boolean;
  type: 'text' | 'image' | 'gif' | 'rose' | 'date' | 'snap' | 'sticker' | 'voice' | 'location' | 'document' | 'game';
  /** A chat game card - the start of a game, or its result. */
  game?: { id: string; kind: string; title: string; emoji: string; result: string | null };
  text?: string;
  uri?: string;
  // A Rose / Spark: a free-or-credited expression of interest, not a purchase.
  rose?: { name: string; emoji: string };
  snap?: { filter: string; sticker?: string; expiresAt: number; viewOnce: boolean };
  sticker?: { faceUri: string; emoji: string; label: string; filter?: string };
  voice?: { uri: string; durationMs: number; transcript?: string; transcriptStatus?: 'available' | 'processing' | 'unavailable' };
  document?: { name: string; size?: number; mimeType?: string; kind: 'document' | 'video' };
  location?: { latitude: number; longitude: number; label: string; live: boolean; expiresAt?: number; accuracy?: number };
  date?: { venue: string; category: string; area: string; time: string; safetyCheckIn: boolean; packageTitle?: string; packageTier?: string; proposalId?: string; planStatus?: DatePlanStatus };
  editedAt?: number;
  deletedAt?: number;
  deletedForEveryone?: boolean;
  forwarded?: boolean;
  /** A reply (or emoji reaction) to the other person's story. Only this label is kept, never the story. */
  storyReply?: { reaction?: boolean };
  reactions?: Record<string,string>;
  starredByMe?: boolean;
  hiddenForMe?: boolean;
  pinnedAt?: number;
  linkPreview?: { url: string; host: string; title: string; description: string; safety: 'safe' | 'caution' | 'danger' };
  createdAt: number;
  status: 'sent' | 'delivered' | 'read';
  // Local-only: the media is still uploading, so the bubble shows a loader.
  // Never sent to the server or persisted.
  uploading?: boolean;
};

export type MatchFilters = {
  lookingFor: 'Women' | 'Men' | 'Everyone';
  minAge: number;
  maxAge: number;
  cities: string[];
  intents: string[];
  mustHaveVibes: string[];
  familyPriority: 'any' | 'high' | 'balanced';
  children: 'any' | 'wants' | 'open' | 'does_not_want';
  marriageTimeline: 'any' | '1_2_years' | '2_3_years';
  relocation: 'any' | 'open' | 'same_city';
  distancePreference: 'anywhere' | 'selected_cities' | 'same_state' | 'open_to_relocate';
};

export type RoseLedger = {
  dayKey: string;
  freeUsed: boolean;
  paidCredits: number;
  sent: Array<{ id: string; matchId: string; note: string; paid: boolean; createdAt: number }>;
};

export type CoupleChatSettings = {
  nickname: string;
  theme: string;
  retentionMode: 'keep' | 'after_seen' | '24_hours' | '7_days';
  screenshotAlerts: boolean;
  conversationPinned: boolean;
  conversationArchived: boolean;
  notificationMode: 'all' | 'mentions' | 'muted';
  notificationSound: 'Apnajoda Chime' | 'Soft Rose' | 'Classic' | 'Silent';
  mutedUntil?: number;
  // Instagram-style "show activity status": when false, this person's own
  // "is typing…" indicator is never sent to the other side (they can
  // still see the other person's, unless that person has also turned
  // theirs off).
  shareTypingStatus: boolean;
};

export const defaultCoupleChatSettings: CoupleChatSettings = {
  nickname: '',
  theme: 'Ruby Velvet',
  retentionMode: 'keep',
  screenshotAlerts: true,
  conversationPinned: false,
  conversationArchived: false,
  notificationMode: 'all',
  notificationSound: 'Apnajoda Chime',
  shareTypingStatus: true,
};

export type ProfileDraft = {
  firstName: string;
  gender: string;
  age: string;
  height: string;
  city: string;
  profession: string;
  religion: string;
  community: string;
  bio?: string; // <-- Bio added
  hobbies?: string[]; // <-- Hobbies added
};

export type DiscoverySignal = {
  id: string;
  type: 'view' | 'interested' | 'skip';
  matchId: string;
  createdAt: number;
};

export type LocalReport = {
  id: string;
  matchId: string;
  reason: string;
  details?: string;
  createdAt: number;
};

export type PersistedAppState = {
  onboardingComplete: boolean;
  onboardingScreen: OnboardingResumeScreen;
  profileReminderShownAt: number;
  authDestination: string;
  verified: boolean;
  profileDraft: ProfileDraft;
  vibes: string[];
  intent: string;
  alignment: Record<string, string>;
  chats: Record<string, ChatMessage[]>;
  coinBalance: number;
  photos: string[];
  selfieUri: string;
  voiceIntroUri: string;
  vouches: string[];
  discoverySignals: DiscoverySignal[];
  smartDiscovery: boolean;
  crossedPaths: boolean;
  blockedIds: string[];
  reports: LocalReport[];
  safeCheckIns: string[];
  matchFilters: MatchFilters;
  roseLedger: RoseLedger;
  lastSeenVisible: boolean;
  analyticsConsent: boolean;
  chatSettings: Record<string, CoupleChatSettings>;
  relationshipReflections: Record<string, RelationshipReflectionRecord>;
  relationshipReminders: Record<string, RelationshipReminderRecord>;
};

export const defaultMatchFilters: MatchFilters = {
  lookingFor: 'Everyone', // <-- Default Everyone
  minAge: 21,             // <-- Default 21
  maxAge: 45,             // <-- Default 45
  cities: [],
  intents: [],
  mustHaveVibes: [],
  familyPriority: 'any',
  children: 'any',
  marriageTimeline: 'any',
  relocation: 'any',
  distancePreference: 'anywhere',
};

export const initialRoseLedger: RoseLedger = {
  dayKey: '',
  freeUsed: false,
  paidCredits: 0,
  sent: [],
};

export const initialProfileDraft: ProfileDraft = {
  firstName: '',
  gender: '',
  age: '',
  city: '',
  height: '',
  profession: '',
  religion: '',
  community: '',
  bio: '',
  hobbies: [],
};

export const initialPersistedState: PersistedAppState = {
  onboardingComplete: false,
  onboardingScreen: 'welcome',
  profileReminderShownAt: 0,
  authDestination: '',
  verified: false,
  profileDraft: initialProfileDraft,
  vibes: [],
  intent: 'Long-term, leading to Marriage',
  alignment: {},
  chats: {},
  coinBalance: 500,
  photos: [],
  selfieUri: '',
  voiceIntroUri: '',
  vouches: [],
  discoverySignals: [],
  smartDiscovery: true,
  crossedPaths: false,
  blockedIds: [],
  reports: [],
  safeCheckIns: [],
  matchFilters: defaultMatchFilters,
  roseLedger: initialRoseLedger,
  lastSeenVisible: true,
  analyticsConsent: false,
  chatSettings: {},
  relationshipReflections: {},
  relationshipReminders: {},
};

export async function loadAppState(): Promise<PersistedAppState> {
  try {
    let raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacyRaw = await AsyncStorage.getItem(legacyKey);
        if (legacyRaw) {
          raw = legacyRaw;
          await AsyncStorage.setItem(STORAGE_KEY, legacyRaw);
          break;
        }
      }
    }
    if (!raw) return initialPersistedState;
    const parsed = JSON.parse(raw);
    const chats = Object.fromEntries(Object.entries(parsed.chats ?? {}).map(([matchId,messages])=>[
      matchId,
      (messages as Array<string | ChatMessage>).map((message,index)=>typeof message==='string'?{
        id:`legacy-${matchId}-${index}`,
        type:'text' as const,
        text:message,
        createdAt:Date.now()+index,
        status:'read' as const,
      }:message),
    ]));
    const profileDraft = { ...initialProfileDraft, ...(parsed.profileDraft ?? {}) };
    const hasLegacyDemoProfile = !parsed.onboardingComplete
      && profileDraft.firstName === 'Arjun'
      && profileDraft.profession === 'Strategy Consultant';
    return {
      ...initialPersistedState,
      ...parsed,
      chats,
      profileDraft: hasLegacyDemoProfile ? initialProfileDraft : profileDraft,
      matchFilters: {
        ...defaultMatchFilters,
        ...(parsed.matchFilters ?? {}),
        lookingFor: parsed.matchFilters?.lookingFor ?? 'Everyone',
      },
      roseLedger: { ...initialRoseLedger, ...(parsed.roseLedger ?? {}) },
      relationshipReflections: Object.fromEntries(Object.entries(parsed.relationshipReflections ?? {}).map(([matchId,value])=>[
        matchId,
        { ...(value as RelationshipReflectionRecord), useForMatching: (value as RelationshipReflectionRecord).useForMatching ?? false },
      ])),
      relationshipReminders: parsed.relationshipReminders ?? {},
      analyticsConsent: parsed.analyticsConsent ?? false,
      onboardingScreen: parsed.onboardingScreen ?? 'welcome',
      profileReminderShownAt: Number(parsed.profileReminderShownAt ?? 0),
    };
  } catch {
    return initialPersistedState;
  }
}

export async function saveAppState(state: PersistedAppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function clearAppState() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await Promise.all(LEGACY_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key)));
}