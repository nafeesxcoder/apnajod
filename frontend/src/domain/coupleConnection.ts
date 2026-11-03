export type CouplePartnerSummary = {
  memberId: string;
  displayName: string;
  city: string;
  profession: string;
  verified: boolean;
};

export type CoupleConnectionRequest = {
  requestId: string;
  member: CouplePartnerSummary;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: string;
};

export type CouplePairingConnection = {
  connectionId: string;
  partnerMemberId: string;
  partnerDisplayName: string;
  lastMessage?: { preview: string; at: number; mine: boolean } | null;
  unreadCount?: number;
};

export type CoupleConnectionHub = {
  experienceMode: 'seeking' | 'couple';
  // The most recently active connection, kept for screens that only ever
  // dealt with one partner. `connections` is the full list — Couple Mode
  // no longer limits a member to a single partner, so a member can hold
  // several of these active at once.
  connection: CouplePairingConnection | null;
  connections: CouplePairingConnection[];
  incomingRequests: CoupleConnectionRequest[];
  outgoingRequests: CoupleConnectionRequest[];
};

export type CoupleModeProfileInput = {
  firstName: string;
  age: string;
  city: string;
  profession: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error('The partner connection response was incomplete.');
  return value.trim();
}

function parsePartner(value: unknown): CouplePartnerSummary {
  if (!isRecord(value)) throw new Error('The partner profile could not be read.');
  return {
    memberId: requiredText(value, 'member_id'),
    displayName: requiredText(value, 'display_name'),
    city: requiredText(value, 'city'),
    profession: requiredText(value, 'profession'),
    verified: value.verified === true,
  };
}

function parseConnection(value: unknown): CouplePairingConnection | null {
  if (!isRecord(value)) return null;
  return {
    connectionId: requiredText(value, 'connection_id'),
    partnerMemberId: requiredText(value, 'partner_member_id'),
    partnerDisplayName: requiredText(value, 'partner_display_name'),
    lastMessage: parseLastMessage(value.last_message),
    unreadCount: typeof value.unread_count === 'number' ? value.unread_count : 0,
  };
}

function parseLastMessage(value: unknown) {
  if (!isRecord(value) || typeof value.preview !== 'string') return null;
  const at = Number(value.at);
  return { preview: value.preview, at: Number.isFinite(at) ? at : 0, mine: value.mine === true };
}

function parseRequest(value: unknown): CoupleConnectionRequest {
  if (!isRecord(value)) throw new Error('A partner request could not be read.');
  const status = value.status;
  if (!['pending', 'accepted', 'declined', 'cancelled', 'expired'].includes(String(status))) throw new Error('A partner request had an invalid status.');
  return {
    requestId: requiredText(value, 'request_id'),
    member: parsePartner(value.member),
    status: status as CoupleConnectionRequest['status'],
    createdAt: requiredText(value, 'created_at'),
    expiresAt: requiredText(value, 'expires_at'),
  };
}

export function parseCoupleConnectionHub(value: unknown): CoupleConnectionHub {
  if (!isRecord(value)) throw new Error('The couple connection response could not be read.');
  const experienceMode = value.experience_mode === 'couple' ? 'couple' : 'seeking';
  const connections = Array.isArray(value.connections)
    ? value.connections.map(parseConnection).filter((c): c is CouplePairingConnection => c !== null)
    : [];
  return {
    experienceMode,
    connection: parseConnection(value.connection) ?? connections[0] ?? null,
    connections,
    incomingRequests: Array.isArray(value.incoming_requests) ? value.incoming_requests.map(parseRequest) : [],
    outgoingRequests: Array.isArray(value.outgoing_requests) ? value.outgoing_requests.map(parseRequest) : [],
  };
}

export function parseCouplePartnerSummary(value: unknown): CouplePartnerSummary {
  return parsePartner(value);
}

export function parseCoupleConnectionRequest(value: unknown): CoupleConnectionRequest {
  return parseRequest(value);
}

export function isCoupleSearchMiss(value: unknown) {
  return isRecord(value) && value.found === false;
}

// ---- WhatsApp-style contacts + partner profile ----------------------

export class CoupleSearchMissError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoupleSearchMissError';
  }
}

export type ContactRelation = 'none' | 'connected' | 'pending_out' | 'pending_in';

export type CoupleContactMatch = {
  phone: string;
  relation: ContactRelation;
  member: CouplePartnerSummary;
};

export type CouplePartnerProfile = {
  connectionId: string;
  memberId: string;
  displayName: string;
  age: number | null;
  city: string;
  profession: string;
  religion: string;
  community: string;
  height: string;
  about: string;
  verified: boolean;
  photos: string[];
  vibes: string[];
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function textList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && !!item.trim()) : [];
}

export function parseCoupleContactMatches(value: unknown): CoupleContactMatch[] {
  if (!isRecord(value) || !Array.isArray(value.matches)) return [];
  const matches: CoupleContactMatch[] = [];
  for (const entry of value.matches) {
    if (!isRecord(entry) || !isRecord(entry.member)) continue;
    const memberId = text(entry.member.member_id);
    const phone = text(entry.phone);
    if (!memberId || !phone) continue;
    const relation = ['connected', 'pending_out', 'pending_in'].includes(String(entry.relation))
      ? (entry.relation as ContactRelation)
      : 'none';
    matches.push({
      phone,
      relation,
      // Lenient on purpose: a member may not have filled in city/profession yet.
      member: {
        memberId,
        displayName: text(entry.member.display_name) || 'Member',
        city: text(entry.member.city),
        profession: text(entry.member.profession),
        verified: entry.member.verified === true,
      },
    });
  }
  return matches;
}

export function parseCouplePartnerProfile(value: unknown): CouplePartnerProfile {
  if (!isRecord(value)) throw new Error('The partner profile could not be read.');
  return {
    connectionId: requiredText(value, 'connection_id'),
    memberId: requiredText(value, 'member_id'),
    displayName: text(value.display_name) || 'Your partner',
    age: typeof value.age === 'number' ? value.age : null,
    city: text(value.city),
    profession: text(value.profession),
    religion: text(value.religion),
    community: text(value.community),
    height: text(value.height),
    about: text(value.about),
    verified: value.verified === true,
    photos: textList(value.photos),
    vibes: textList(value.vibes),
  };
}
