/**
 * Frontend-owned contracts only.
 *
 * AWS implementations belong in the employee's backend/integration project.
 * The Expo application receives an implementation through composition and
 * never imports a database, authentication provider, or server SDK.
 */
export type AsyncResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; retryable: boolean } };

export type AuthDestination = { kind: 'email' | 'phone'; value: string };

export interface AuthPort {
  requestCode(destination: AuthDestination): Promise<AsyncResult<{ challengeId: string }>>;
  verifyCode(challengeId: string, code: string): Promise<AsyncResult<{ memberId: string }>>;
  signOut(): Promise<AsyncResult<void>>;
}

export interface MemberPort<TProfile, TBootstrap> {
  loadBootstrap(): Promise<AsyncResult<TBootstrap>>;
  saveProfile(profile: TProfile): Promise<AsyncResult<TProfile>>;
  requestAccountDeletion(): Promise<AsyncResult<{ requestedAt: string }>>;
}

export interface DiscoveryPort<TMatch, TPreferences> {
  loadDailyMatches(preferences: TPreferences): Promise<AsyncResult<TMatch[]>>;
  recordDecision(matchId: string, decision: 'interested' | 'pass' | 'rose'): Promise<AsyncResult<void>>;
}

export interface ChatPort<TMessage> {
  loadMessages(conversationId: string): Promise<AsyncResult<TMessage[]>>;
  sendMessage(conversationId: string, message: TMessage): Promise<AsyncResult<TMessage>>;
  subscribe(conversationId: string, onMessage: (message: TMessage) => void): () => void;
}

export interface CommercePort<TQuote, TOrder> {
  createQuote(input: unknown): Promise<AsyncResult<TQuote>>;
  placeOrder(input: unknown): Promise<AsyncResult<TOrder>>;
  cancelOrder(orderId: string): Promise<AsyncResult<TOrder>>;
}

export interface SupportPort {
  submitTicket(input: { topic: string; subject: string; message: string }): Promise<AsyncResult<{ ticketId: string }>>;
  submitReport(input: { memberId: string; reason: string; details?: string }): Promise<AsyncResult<{ reportId: string }>>;
}

export interface AppPorts<TProfile, TBootstrap, TMatch, TPreferences, TMessage, TQuote, TOrder> {
  auth: AuthPort;
  member: MemberPort<TProfile, TBootstrap>;
  discovery: DiscoveryPort<TMatch, TPreferences>;
  chat: ChatPort<TMessage>;
  commerce: CommercePort<TQuote, TOrder>;
  support: SupportPort;
}
