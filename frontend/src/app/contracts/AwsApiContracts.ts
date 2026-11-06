/**
 * Apnajoda frontend ↔ AWS boundary.
 *
 * This file contains DTOs and ports only. It must never import an AWS SDK,
 * database client, authentication provider, payment SDK or server secret.
 * Employee-owned AWS adapters implement these ports at the composition root.
 */

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
  requestId?: string;
  fieldErrors?: Record<string, string>;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
export type Page<T> = { items: T[]; nextCursor: string | null };
export type Unsubscribe = () => void;

export type AuthDestination = { kind: 'email' | 'phone'; value: string };
export type AuthSession = { memberId: string; accessToken: string; expiresAt: string };

export interface AuthApi {
  requestCode(input: AuthDestination): Promise<ApiResult<{ challengeId: string; expiresAt: string }>>;
  verifyCode(input: { challengeId: string; code: string }): Promise<ApiResult<AuthSession>>;
  refreshSession(): Promise<ApiResult<AuthSession>>;
  signOut(): Promise<ApiResult<void>>;
}

export type MemberProfileDto = {
  id: string;
  displayName: string;
  birthDate: string;
  city: string;
  relationshipIntent: string;
  familyPriority: string;
  values: string[];
  vibes: string[];
  bio: string;
  photoUrls: string[];
  voiceIntroUrl?: string;
  verified: boolean;
  updatedAt: string;
};

export type MemberPreferencesDto = {
  intent: string;
  vibes: string[];
  ageMin: number;
  ageMax: number;
  radiusMiles: number;
  cities: string[];
  verifiedOnly: boolean;
};

export type MemberBootstrapDto = {
  profile: MemberProfileDto | null;
  preferences: MemberPreferencesDto | null;
  onboardingComplete: boolean;
  experienceMode: 'seeking' | 'couple';
  entitlements: string[];
};

export interface MemberApi {
  loadBootstrap(): Promise<ApiResult<MemberBootstrapDto>>;
  saveProfile(profile: Omit<MemberProfileDto, 'id' | 'updatedAt'>): Promise<ApiResult<MemberProfileDto>>;
  savePreferences(preferences: MemberPreferencesDto): Promise<ApiResult<MemberPreferencesDto>>;
  uploadMedia(input: { kind: 'profile_photo' | 'selfie' | 'voice_intro'; uri: string; contentType: string }): Promise<ApiResult<{ url: string }>>;
  updatePrivacy(input: { lastSeenVisible?: boolean; analyticsConsent?: boolean }): Promise<ApiResult<void>>;
  requestDataExport(): Promise<ApiResult<{ requestId: string }>>;
  requestAccountDeletion(): Promise<ApiResult<{ requestId: string; requestedAt: string }>>;
}

export type MatchDto = {
  id: string;
  displayName: string;
  age: number;
  city: string;
  relationshipIntent: string;
  familyPriority: string;
  values: string[];
  vibes: string[];
  bio: string;
  photoUrls: string[];
  verified: boolean;
  explanation: string[];
};

export interface DiscoveryApi {
  loadDailyIntroductions(preferences: MemberPreferencesDto): Promise<ApiResult<MatchDto[]>>;
  loadLikes(cursor?: string): Promise<ApiResult<Page<MatchDto>>>;
  recordDecision(input: { matchId: string; decision: 'interested' | 'pass' | 'golden_spark' }): Promise<ApiResult<{ mutual: boolean; conversationId?: string }>>;
  recordProfileView(matchId: string): Promise<ApiResult<void>>;
  submitFeedback(input: { matchId: string; signal: 'promising' | 'not_aligned' | 'met_in_person'; useForMatching: boolean }): Promise<ApiResult<void>>;
  block(matchId: string): Promise<ApiResult<void>>;
  unmatch(matchId: string): Promise<ApiResult<void>>;
}

export type MessageKind = 'text' | 'image' | 'gif' | 'sticker' | 'voice' | 'document' | 'location' | 'date' | 'rose' | 'snap';
export type ChatMessageDto = {
  id: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  payload: Record<string, unknown>;
  createdAt: string;
  editedAt?: string;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
};

export type RealtimeEvent =
  | { type: 'message'; message: ChatMessageDto }
  | { type: 'typing'; memberId: string; active: boolean }
  | { type: 'presence'; memberId: string; online: boolean }
  | { type: 'receipt'; messageId: string; status: 'delivered' | 'read'; at: string }
  | { type: 'call'; payload: Record<string, unknown> };

export interface ChatApi {
  loadMessages(input: { conversationId: string; cursor?: string }): Promise<ApiResult<Page<ChatMessageDto>>>;
  sendMessage(input: Omit<ChatMessageDto, 'id' | 'createdAt' | 'deliveryStatus'> & { clientMessageId: string }): Promise<ApiResult<ChatMessageDto>>;
  editMessage(input: { conversationId: string; messageId: string; text: string }): Promise<ApiResult<ChatMessageDto>>;
  deleteMessage(input: { conversationId: string; messageId: string }): Promise<ApiResult<void>>;
  updateMessageState(input: { conversationId: string; messageId: string; starred?: boolean; pinned?: boolean; reaction?: string | null }): Promise<ApiResult<void>>;
  markRead(conversationId: string): Promise<ApiResult<void>>;
  subscribe(conversationId: string, onEvent: (event: RealtimeEvent) => void, onError: (error: ApiError) => void): Unsubscribe;
}

export type CoupleMemberDto = { memberId: string; displayName: string; photoUrl?: string };
export type CoupleConnectionDto = {
  status: 'inactive' | 'pending' | 'active';
  partner?: CoupleMemberDto;
  incomingRequests: Array<{ id: string; member: CoupleMemberDto; createdAt: string }>;
  outgoingRequests: Array<{ id: string; member: CoupleMemberDto; createdAt: string }>;
};

export interface CoupleApi {
  loadConnection(): Promise<ApiResult<CoupleConnectionDto>>;
  searchPartner(phoneE164: string): Promise<ApiResult<CoupleMemberDto | null>>;
  sendRequest(memberId: string): Promise<ApiResult<{ requestId: string }>>;
  respondToRequest(input: { requestId: string; accept: boolean }): Promise<ApiResult<CoupleConnectionDto>>;
  setExperienceMode(mode: 'seeking' | 'couple'): Promise<ApiResult<void>>;
}

export type MoneyDto = { amountMinor: number; currency: 'INR' };
export type ReservationQuoteDto = { quoteId: string; total: MoneyDto; expiresAt: string; cancellationPolicy: string };
export interface PaymentsApi {
  createReservationQuote(input: { venueId: string; packageId?: string; scheduledAt: string }): Promise<ApiResult<ReservationQuoteDto>>;
  createCheckoutSession(input: { quoteId: string; wallet: 'apple_pay' | 'google_pay' | 'card' }): Promise<ApiResult<{ sessionId: string; clientToken: string }>>;
  confirmReservation(sessionId: string): Promise<ApiResult<{ reservationId: string; status: string }>>;
  restorePurchases(): Promise<ApiResult<{ entitlements: string[] }>>;
}

export type PlaceDto = { id: string; name: string; city: string; kind: string; coordinates: { latitude: number; longitude: number }; address: string; rating?: number; reservable: boolean };
export interface PlacesApi {
  search(input: { city: string; query?: string; kind?: string; radiusMiles?: number; cursor?: string }): Promise<ApiResult<Page<PlaceDto>>>;
}

export interface NotificationsApi {
  registerDevice(input: { token: string; platform: 'ios' | 'android' | 'web' }): Promise<ApiResult<void>>;
  unregisterDevice(token: string): Promise<ApiResult<void>>;
}

export interface TrustAndSupportApi {
  submitReport(input: { memberId: string; reason: string; details?: string }): Promise<ApiResult<{ reportId: string }>>;
  submitTicket(input: { topic: string; message: string; caseId?: string }): Promise<ApiResult<{ ticketId: string }>>;
  submitVerification(input: { selfieUrl?: string; documentUploadId?: string }): Promise<ApiResult<{ verificationId: string; status: string }>>;
  createSafetyCheckIn(input: { datePlanId: string; trustedContactIds: string[] }): Promise<ApiResult<{ checkInId: string }>>;
}

export interface MilaanAwsApi {
  auth: AuthApi;
  member: MemberApi;
  discovery: DiscoveryApi;
  chat: ChatApi;
  couple: CoupleApi;
  payments: PaymentsApi;
  places: PlacesApi;
  notifications: NotificationsApi;
  trustAndSupport: TrustAndSupportApi;
}
