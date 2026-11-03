import type {
  ApiResult,
  ChatMessageDto,
  CoupleConnectionDto,
  MilaanAwsApi,
  MatchDto,
  MemberBootstrapDto,
  MemberPreferencesDto,
  MemberProfileDto,
  PlaceDto,
} from '../contracts/AwsApiContracts';

const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data });

const emptyBootstrap: MemberBootstrapDto = {
  profile: null,
  preferences: null,
  onboardingComplete: false,
  experienceMode: 'seeking',
  entitlements: [],
};

const emptyCoupleConnection: CoupleConnectionDto = {
  status: 'inactive',
  incomingRequests: [],
  outgoingRequests: [],
};

/**
 * Safe local adapter for UI development and public previews.
 * It performs no network request, authentication, payment or persistence.
 */
export function createPreviewAwsApi(input: {
  bootstrap?: MemberBootstrapDto;
  matches?: MatchDto[];
  places?: PlaceDto[];
} = {}): MilaanAwsApi {
  const messages = new Map<string, ChatMessageDto[]>();
  let profile: MemberProfileDto | null = input.bootstrap?.profile ?? null;
  let preferences: MemberPreferencesDto | null = input.bootstrap?.preferences ?? null;
  let coupleConnection = emptyCoupleConnection;

  return {
    auth: {
      requestCode: async destination => ok({ challengeId: `preview-${destination.kind}`, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() }),
      verifyCode: async () => ok({ memberId: 'preview-member', accessToken: 'preview-only', expiresAt: new Date(Date.now() + 60 * 60_000).toISOString() }),
      refreshSession: async () => ok({ memberId: 'preview-member', accessToken: 'preview-only', expiresAt: new Date(Date.now() + 60 * 60_000).toISOString() }),
      signOut: async () => ok(undefined),
    },
    member: {
      loadBootstrap: async () => ok({ ...emptyBootstrap, ...input.bootstrap, profile, preferences }),
      saveProfile: async draft => {
        profile = { ...draft, id: profile?.id ?? 'preview-member', updatedAt: new Date().toISOString() };
        return ok(profile);
      },
      savePreferences: async next => {
        preferences = next;
        return ok(next);
      },
      uploadMedia: async media => ok({ url: media.uri }),
      updatePrivacy: async () => ok(undefined),
      requestDataExport: async () => ok({ requestId: 'preview-data-export' }),
      requestAccountDeletion: async () => ok({ requestId: 'preview-delete', requestedAt: new Date().toISOString() }),
    },
    discovery: {
      loadDailyIntroductions: async () => ok(input.matches ?? []),
      loadLikes: async () => ok({ items: input.matches ?? [], nextCursor: null }),
      recordDecision: async () => ok({ mutual: false }),
      recordProfileView: async () => ok(undefined),
      submitFeedback: async () => ok(undefined),
      block: async () => ok(undefined),
      unmatch: async () => ok(undefined),
    },
    chat: {
      loadMessages: async ({ conversationId }) => ok({ items: messages.get(conversationId) ?? [], nextCursor: null }),
      sendMessage: async draft => {
        const message: ChatMessageDto = { ...draft, id: draft.clientMessageId, createdAt: new Date().toISOString(), deliveryStatus: 'sent' };
        const current = messages.get(draft.conversationId) ?? [];
        messages.set(draft.conversationId, [...current, message]);
        return ok(message);
      },
      editMessage: async ({ conversationId, messageId, text }) => {
        const current = messages.get(conversationId) ?? [];
        const found = current.find(message => message.id === messageId);
        if (!found) return { ok: false, error: { code: 'NOT_FOUND', message: 'Preview message was not found.', retryable: false } };
        const updated = { ...found, payload: { ...found.payload, text }, editedAt: new Date().toISOString() };
        messages.set(conversationId, current.map(message => message.id === messageId ? updated : message));
        return ok(updated);
      },
      deleteMessage: async ({ conversationId, messageId }) => {
        messages.set(conversationId, (messages.get(conversationId) ?? []).filter(message => message.id !== messageId));
        return ok(undefined);
      },
      updateMessageState: async () => ok(undefined),
      markRead: async () => ok(undefined),
      subscribe: () => () => undefined,
    },
    couple: {
      loadConnection: async () => ok(coupleConnection),
      searchPartner: async () => ok(null),
      sendRequest: async () => ok({ requestId: 'preview-couple-request' }),
      respondToRequest: async () => ok(coupleConnection),
      setExperienceMode: async mode => {
        if (mode === 'seeking') coupleConnection = emptyCoupleConnection;
        return ok(undefined);
      },
    },
    payments: {
      createReservationQuote: async () => ok({ quoteId: 'preview-reservation-quote', total: { amountMinor: 0, currency: 'INR' }, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(), cancellationPolicy: 'Preview only — no reservation created.' }),
      createCheckoutSession: async () => ok({ sessionId: 'preview-checkout', clientToken: 'preview-only' }),
      confirmReservation: async () => ok({ reservationId: 'preview-reservation', status: 'preview' }),
      restorePurchases: async () => ok({ entitlements: [] }),
    },
    places: {
      search: async () => ok({ items: input.places ?? [], nextCursor: null }),
    },
    notifications: {
      registerDevice: async () => ok(undefined),
      unregisterDevice: async () => ok(undefined),
    },
    trustAndSupport: {
      submitReport: async () => ok({ reportId: 'preview-report' }),
      submitTicket: async () => ok({ ticketId: 'preview-ticket' }),
      submitVerification: async () => ok({ verificationId: 'preview-verification', status: 'preview' }),
      createSafetyCheckIn: async () => ok({ checkInId: 'preview-check-in' }),
    },
  };
}
