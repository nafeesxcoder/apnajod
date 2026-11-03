export const experienceModes = ['seeking', 'couple'] as const;
export type ExperienceMode = (typeof experienceModes)[number];

export const coupleConnectionStatuses = ['unpaired', 'pending', 'active', 'paused'] as const;
export type CoupleConnectionStatus = (typeof coupleConnectionStatuses)[number];

export type CouplePartner = {
  memberId: string;
  displayName: string;
};

export type CoupleInvite = {
  inviteId: string;
  code: string;
  expiresAt: string;
};

export type CoupleConnection = {
  status: CoupleConnectionStatus;
  connectionId: string | null;
  partner: CouplePartner | null;
  invite: CoupleInvite | null;
  updatedAt: string | null;
};

export type CoupleModeState = {
  schemaVersion: 1;
  revision: number;
  experienceMode: ExperienceMode;
  connection: CoupleConnection;
};

const emptyConnection = (): CoupleConnection => ({
  status: 'unpaired',
  connectionId: null,
  partner: null,
  invite: null,
  updatedAt: null,
});

export const initialCoupleModeState: CoupleModeState = {
  schemaVersion: 1,
  revision: 0,
  experienceMode: 'seeking',
  connection: emptyConnection(),
};

export type CoupleModeEvent =
  | { type: 'select_experience'; mode: ExperienceMode; at: string }
  | { type: 'create_partner_invite'; invite: CoupleInvite; at: string }
  | { type: 'cancel_partner_invite'; at: string }
  | { type: 'link_partner'; connectionId: string; partner: CouplePartner; at: string }
  | { type: 'pause_connection'; at: string }
  | { type: 'resume_connection'; at: string }
  | { type: 'disconnect_partner'; at: string };

function commit(state: CoupleModeState, connection: CoupleConnection): CoupleModeState {
  return { ...state, revision: state.revision + 1, connection };
}

function hasText(value: string) {
  return value.trim().length > 0;
}

function isValidTimestamp(value: string) {
  return hasText(value) && Number.isFinite(Date.parse(value));
}

export function reduceCoupleMode(state: CoupleModeState, event: CoupleModeEvent): CoupleModeState {
  if (!isValidTimestamp(event.at)) return state;

  if (event.type === 'select_experience') {
    if (!experienceModes.includes(event.mode) || event.mode === state.experienceMode) return state;
    return {
      ...state,
      revision: state.revision + 1,
      experienceMode: event.mode,
      connection: { ...emptyConnection(), updatedAt: event.at },
    };
  }

  if (state.experienceMode !== 'couple') return state;

  switch (event.type) {
    case 'create_partner_invite': {
      if (
        state.connection.status === 'active' ||
        state.connection.status === 'paused' ||
        !hasText(event.invite.inviteId) ||
        !hasText(event.invite.code) ||
        !isValidTimestamp(event.invite.expiresAt) ||
        Date.parse(event.invite.expiresAt) <= Date.parse(event.at)
      ) return state;
      return commit(state, {
        status: 'pending',
        connectionId: null,
        partner: null,
        invite: {
          inviteId: event.invite.inviteId.trim(),
          code: event.invite.code.trim(),
          expiresAt: event.invite.expiresAt,
        },
        updatedAt: event.at,
      });
    }
    case 'cancel_partner_invite':
      if (state.connection.status !== 'pending') return state;
      return commit(state, { ...emptyConnection(), updatedAt: event.at });
    case 'link_partner':
      if (!hasText(event.connectionId) || !hasText(event.partner.memberId) || !hasText(event.partner.displayName)) return state;
      return commit(state, {
        status: 'active',
        connectionId: event.connectionId.trim(),
        partner: {
          memberId: event.partner.memberId.trim(),
          displayName: event.partner.displayName.trim(),
        },
        invite: null,
        updatedAt: event.at,
      });
    case 'pause_connection':
      if (state.connection.status !== 'active') return state;
      return commit(state, { ...state.connection, status: 'paused', updatedAt: event.at });
    case 'resume_connection':
      if (state.connection.status !== 'paused') return state;
      return commit(state, { ...state.connection, status: 'active', updatedAt: event.at });
    case 'disconnect_partner':
      if (state.connection.status === 'unpaired') return state;
      return commit(state, { ...emptyConnection(), updatedAt: event.at });
  }
}

export const experienceSurfaces = [
  'matching',
  'discover',
  'likes',
  'chat',
  'date_planning',
  'games',
  'profile',
  'safety',
  'pricing',
  'support',
] as const;
export type ExperienceSurface = (typeof experienceSurfaces)[number];

export type CoupleNavigationItem = {
  id: 'chat' | 'dates' | 'games' | 'profile';
  label: string;
  icon: string;
  surface: ExperienceSurface;
  requiresPartnerLink: boolean;
};

export const couplePrimaryNavigation = [
  { id: 'chat', label: 'Chat', icon: 'chatbubble-ellipses-outline', surface: 'chat', requiresPartnerLink: true },
  { id: 'dates', label: 'Dates', icon: 'calendar-outline', surface: 'date_planning', requiresPartnerLink: false },
  { id: 'games', label: 'Games', icon: 'game-controller-outline', surface: 'games', requiresPartnerLink: true },
  { id: 'profile', label: 'Profile', icon: 'person-outline', surface: 'profile', requiresPartnerLink: false },
] as const satisfies readonly CoupleNavigationItem[];

const matchingOnlySurfaces: readonly ExperienceSurface[] = ['matching', 'discover', 'likes'];

export type CoupleModeCapabilities = {
  canUseMatching: boolean;
  canUseDiscovery: boolean;
  canSeeLikes: boolean;
  canOpenChat: boolean;
  canBrowseDates: boolean;
  canPlanDates: boolean;
  canPlayGames: boolean;
  needsPartnerConnection: boolean;
};

export type CoupleModeAccess = {
  experienceMode: ExperienceMode;
  hiddenSurfaces: readonly ExperienceSurface[];
  primaryNavigation: readonly CoupleNavigationItem[];
  capabilities: CoupleModeCapabilities;
};

export function buildCoupleModeAccess(state: CoupleModeState): CoupleModeAccess {
  const isCoupleMode = state.experienceMode === 'couple';
  const partnerConnected = isCoupleMode && state.connection.status === 'active';
  return {
    experienceMode: state.experienceMode,
    hiddenSurfaces: isCoupleMode ? matchingOnlySurfaces : [],
    primaryNavigation: isCoupleMode ? couplePrimaryNavigation : [],
    capabilities: {
      canUseMatching: !isCoupleMode,
      canUseDiscovery: !isCoupleMode,
      canSeeLikes: !isCoupleMode,
      canOpenChat: !isCoupleMode || partnerConnected,
      canBrowseDates: true,
      canPlanDates: !isCoupleMode || partnerConnected,
      canPlayGames: !isCoupleMode || partnerConnected,
      needsPartnerConnection: isCoupleMode && !partnerConnected,
    },
  };
}

export function canAccessExperienceSurface(state: CoupleModeState, surface: ExperienceSurface) {
  return !(state.experienceMode === 'couple' && matchingOnlySurfaces.includes(surface));
}

export type SurfaceAccessDecision = {
  allowed: boolean;
  requested: ExperienceSurface;
  resolved: ExperienceSurface;
  reason: 'allowed' | 'matching_disabled_in_couple_mode';
};

export function guardExperienceSurface(state: CoupleModeState, requested: ExperienceSurface): SurfaceAccessDecision {
  if (canAccessExperienceSurface(state, requested)) {
    return { allowed: true, requested, resolved: requested, reason: 'allowed' };
  }
  return {
    allowed: false,
    requested,
    resolved: state.connection.status === 'active' ? 'chat' : 'profile',
    reason: 'matching_disabled_in_couple_mode',
  };
}

export type CoupleModeBackendSnapshotV1 = {
  schema_version: 1;
  revision: number;
  experience_mode: ExperienceMode;
  connection_status: CoupleConnectionStatus;
  connection_id: string | null;
  partner_member_id: string | null;
  partner_display_name: string | null;
  invite_id: string | null;
  invite_code: string | null;
  invite_expires_at: string | null;
  updated_at: string | null;
};

export const coupleModeRoutes = [
  'home',
  'explore',
  'discovery',
  'detail',
  'mutual',
  'icebreaker',
  'likes',
  'chat',
  'datePlan',
  'games',
  'events',
  'profile',
  'safety',
  'support',
  'pricing',
  'verifyHub',
  'executive',
] as const;
export type CoupleModeRoute = (typeof coupleModeRoutes)[number];

const coupleAlwaysAllowedRoutes: readonly CoupleModeRoute[] = [
  'home',
  'events',
  'profile',
  'safety',
  'support',
  'pricing',
  'verifyHub',
];
const couplePairGatedRoutes: readonly CoupleModeRoute[] = ['chat', 'datePlan', 'games'];

export type CoupleModeRouteDecision = {
  allowed: boolean;
  requested: CoupleModeRoute;
  resolved: CoupleModeRoute;
  reason: 'allowed' | 'matching_disabled_in_couple_mode' | 'partner_connection_required';
};

export function guardCoupleModeRoute(state: CoupleModeState, requested: CoupleModeRoute): CoupleModeRouteDecision {
  if (state.experienceMode === 'seeking') {
    return { allowed: true, requested, resolved: requested, reason: 'allowed' };
  }
  if (coupleAlwaysAllowedRoutes.includes(requested)) {
    return { allowed: true, requested, resolved: requested, reason: 'allowed' };
  }
  if (couplePairGatedRoutes.includes(requested)) {
    if (state.connection.status === 'active') {
      return { allowed: true, requested, resolved: requested, reason: 'allowed' };
    }
    return { allowed: false, requested, resolved: 'profile', reason: 'partner_connection_required' };
  }
  return { allowed: false, requested, resolved: 'home', reason: 'matching_disabled_in_couple_mode' };
}

export function toCoupleModeBackendSnapshot(state: CoupleModeState): CoupleModeBackendSnapshotV1 {
  return {
    schema_version: 1,
    revision: state.revision,
    experience_mode: state.experienceMode,
    connection_status: state.connection.status,
    connection_id: state.connection.connectionId,
    partner_member_id: state.connection.partner?.memberId ?? null,
    partner_display_name: state.connection.partner?.displayName ?? null,
    invite_id: state.connection.invite?.inviteId ?? null,
    invite_code: state.connection.invite?.code ?? null,
    invite_expires_at: state.connection.invite?.expiresAt ?? null,
    updated_at: state.connection.updatedAt,
  };
}
