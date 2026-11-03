export type PrivacyTier = 'public' | 'member_private' | 'sensitive' | 'restricted';

export type AppDataModuleKey =
  | 'identity'
  | 'profile'
  | 'profile_media'
  | 'preferences'
  | 'discovery'
  | 'matching'
  | 'chat'
  | 'notifications'
  | 'trust'
  | 'safety'
  | 'subscription'
  | 'date_plans'
  | 'executive'
  | 'support';

export type AppDataModule = {
  key: AppDataModuleKey;
  label: string;
  backendTable: string;
  purpose: string;
  privacyTier: PrivacyTier;
  retention: string;
  publicSurface: string;
  backendReady: boolean;
  realtime: boolean;
  needsProvider: boolean;
  adminReview: boolean;
};

export const productionDataModules = [
  {
    key: 'identity',
    label: 'Identity & session',
    backendTable: 'auth.users / push_tokens',
    purpose: 'Phone/email auth, session control and trusted-device tracking.',
    privacyTier: 'sensitive',
    retention: 'Until account deletion, with session revocation controls.',
    publicSurface: 'Verified badge only',
    backendReady: true,
    realtime: false,
    needsProvider: true,
    adminReview: false,
  },
  {
    key: 'profile',
    label: 'Member profile',
    backendTable: 'profiles',
    purpose: 'Name, age, city, profession, bio, religion/community and onboarding state.',
    privacyTier: 'member_private',
    retention: 'Until edited or deleted by member.',
    publicSurface: 'Profile cards and detail page',
    backendReady: true,
    realtime: false,
    needsProvider: false,
    adminReview: false,
  },
  {
    key: 'profile_media',
    label: 'Photos & voice intro',
    backendTable: 'profile_photos / storage.profile-media',
    purpose: 'Approved profile photos, private verification media and voice intros.',
    privacyTier: 'sensitive',
    retention: 'Until member removal, moderation removal or account deletion.',
    publicSurface: 'Approved photos and voice intro access',
    backendReady: true,
    realtime: false,
    needsProvider: true,
    adminReview: true,
  },
  {
    key: 'preferences',
    label: 'Preferences & filters',
    backendTable: 'user_preferences / privacy_settings',
    purpose: 'Intent, vibes, family plans, relocation, city filters and privacy controls.',
    privacyTier: 'member_private',
    retention: 'Until changed or reset by member.',
    publicSurface: 'Never directly shown',
    backendReady: true,
    realtime: false,
    needsProvider: false,
    adminReview: false,
  },
  {
    key: 'discovery',
    label: 'Discovery learning',
    backendTable: 'discovery_signals / profile_views',
    purpose: 'In-app views, skips, interests and profile-view notifications after deep views.',
    privacyTier: 'member_private',
    retention: 'Resettable by member; aggregate signals kept for safety/fraud.',
    publicSurface: 'Profile-view notification only when privacy allows',
    backendReady: true,
    realtime: true,
    needsProvider: false,
    adminReview: false,
  },
  {
    key: 'matching',
    label: 'Matching decisions',
    backendTable: 'matches / likes / icebreakers',
    purpose: 'Daily match decks, interested/pass decisions and mutual-match unlocks.',
    privacyTier: 'member_private',
    retention: 'Until match expires, is blocked, or account is deleted.',
    publicSurface: 'Strong/Great/Exceptional label only',
    backendReady: true,
    realtime: true,
    needsProvider: false,
    adminReview: false,
  },
  {
    key: 'chat',
    label: 'Chat & media',
    backendTable: 'messages / chat_settings / live_location_shares',
    purpose: 'Messages, photos, GIFs, snaps, voice notes, couple themes and live location shares.',
    privacyTier: 'sensitive',
    retention: 'Until deleted, reported retention hold, or account deletion.',
    publicSurface: 'Visible only inside mutual-match chat',
    backendReady: true,
    realtime: true,
    needsProvider: true,
    adminReview: false,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    backendTable: 'member_notifications / push_tokens',
    purpose: 'Profile views, roses, matches, support and safety alerts.',
    privacyTier: 'member_private',
    retention: 'Until read/expired or account deletion.',
    publicSurface: 'Device notification copy',
    backendReady: true,
    realtime: true,
    needsProvider: true,
    adminReview: false,
  },
  {
    key: 'trust',
    label: 'Trust engine',
    backendTable: 'trusted_vouches / verification provider records',
    purpose: 'Selfie liveness, ID check, friend vouches and business proof state.',
    privacyTier: 'restricted',
    retention: 'Provider-led retention plus account deletion requirements.',
    publicSurface: 'Simple trust badges only',
    backendReady: true,
    realtime: false,
    needsProvider: true,
    adminReview: true,
  },
  {
    key: 'safety',
    label: 'Safety & moderation',
    backendTable: 'reports / blocks / safety_checkins / deletion_requests',
    purpose: 'Reports, blocks, date safety check-ins, export/delete requests and abuse triage.',
    privacyTier: 'restricted',
    retention: 'Safety hold where legally required; otherwise deletion workflow.',
    publicSurface: 'Blocked members disappear',
    backendReady: true,
    realtime: true,
    needsProvider: false,
    adminReview: true,
  },
  {
    key: 'subscription',
    label: 'Plans & billing',
    backendTable: 'subscriptions / coin_ledger',
    purpose: 'Free, Plus, premium packs, coin ledger, restore purchase and entitlement state.',
    privacyTier: 'sensitive',
    retention: 'Financial retention by provider and app-store rules.',
    publicSurface: 'Plan badge when member chooses',
    backendReady: true,
    realtime: false,
    needsProvider: true,
    adminReview: false,
  },
  {
    key: 'date_plans',
    label: 'Date planning',
    backendTable: 'date_proposals / safety_checkins',
    purpose: 'Public-place date proposals, reservation intent and post-date safety check-ins.',
    privacyTier: 'sensitive',
    retention: 'Until date passes, report hold, or account deletion.',
    publicSurface: 'Shared only with the matched member',
    backendReady: true,
    realtime: true,
    needsProvider: true,
    adminReview: false,
  },
  {
    key: 'executive',
    label: 'Executive Circle',
    backendTable: 'executive applications / trust records',
    purpose: 'Business-owner verification, concierge review, invite-only matching and ₹49,999/year plan.',
    privacyTier: 'restricted',
    retention: 'Application review retention plus account deletion workflow.',
    publicSurface: 'Executive badge after approval',
    backendReady: true,
    realtime: false,
    needsProvider: true,
    adminReview: true,
  },
  {
    key: 'support',
    label: 'Support operations',
    backendTable: 'support_tickets / support_ticket_events',
    purpose: 'Help desk tickets, support timeline, billing/safety escalation and audit trail.',
    privacyTier: 'restricted',
    retention: 'Until closed plus compliance window.',
    publicSurface: 'Ticket ID and support status',
    backendReady: true,
    realtime: true,
    needsProvider: false,
    adminReview: true,
  },
] as const satisfies readonly AppDataModule[];

export type LaunchReadinessSnapshot = {
  totalModules: number;
  backendReadyModules: number;
  realtimeModules: number;
  providerModules: number;
  adminReviewModules: number;
  restrictedModules: number;
  percentReady: number;
  criticalModules: string[];
};

export function getLaunchReadinessSnapshot(modules: readonly AppDataModule[] = productionDataModules): LaunchReadinessSnapshot {
  const totalModules = modules.length;
  const backendReadyModules = modules.filter((module) => module.backendReady).length;
  const realtimeModules = modules.filter((module) => module.realtime).length;
  const providerModules = modules.filter((module) => module.needsProvider).length;
  const adminReviewModules = modules.filter((module) => module.adminReview).length;
  const restrictedModules = modules.filter((module) => module.privacyTier === 'restricted').length;
  return {
    totalModules,
    backendReadyModules,
    realtimeModules,
    providerModules,
    adminReviewModules,
    restrictedModules,
    percentReady: totalModules ? Math.round((backendReadyModules / totalModules) * 100) : 0,
    criticalModules: modules.filter((module) => module.needsProvider || module.adminReview).map((module) => module.label),
  };
}

export type PrivacySafeEvent = {
  id: string;
  memberId: string;
  type: 'profile_view' | 'match_decision' | 'rose_sent' | 'date_plan' | 'safety_report' | 'support_ticket' | 'trust_update';
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
};

const sensitiveKeyPattern = /(token|password|secret|otp|code|phone|email|address|latitude|longitude|lat|lng|precise|ssn|passport|driver)/i;

export function redactSensitiveEventMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => {
    if (sensitiveKeyPattern.test(key)) return [key, '[redacted]'];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) return [key, value];
    return [key, '[object]'];
  })) as PrivacySafeEvent['metadata'];
}

export function buildPrivacySafeEvent(input: Omit<PrivacySafeEvent, 'metadata'> & { metadata?: Record<string, unknown> }): PrivacySafeEvent {
  return {
    ...input,
    metadata: redactSensitiveEventMetadata(input.metadata ?? {}),
  };
}
