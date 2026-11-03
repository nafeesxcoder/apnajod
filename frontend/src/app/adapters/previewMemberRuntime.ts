export type MatchingPoolStatus = {
  status: 'ready' | 'sparse' | 'empty' | 'profile_incomplete' | 'verification_required' | 'preferences_incomplete';
  eligibleCount: number;
  dailyLimit: number;
  repeatCooldownDays: number;
  suggestions: string[];
};

export type SupportTopic = 'Safety' | 'Account' | 'Billing' | 'Technical' | 'Feedback' | 'Appeal';
export const backendMode = 'demo' as const;
export const allowsPreviewOtpFallback = true;
export const appEnvironment: 'development'|'staging'|'production' = 'development';
export const requiresRealBackend = false;
export const isApiConfigured = false;
export const backendRuntime = { mode: 'demo' as const };
// Trusted-circle vouch rewards: demo until real reward fulfilment is wired.
export const vouchRewardsMode:'demo'|'live'|'blocked'='demo';

export async function beginAuthentication(_request: { mode: 'phone'; phone: string } | { mode: 'email'; email: string; password: string }) {
  return { preview: true };
}
export async function verifyAuthentication(_destination: string, _token: string, _password?: string) { return true; }
export async function fetchDailyMatches(_limit = 5) { return null; }
export async function fetchMatchingPoolStatus(): Promise<MatchingPoolStatus | null> { return null; }
export async function loadCurrentMemberBootstrap(): Promise<import('../../domain/memberBootstrap').MemberBootstrap | null> { return null; }
export async function fetchCommunityRooms(_city: string) { return null; }
export async function joinCommunityRoom(_roomId: string) { return null; }
export async function requestAccountDeletion() { return null; }
export async function submitModerationAppeal(_caseId: string, _reason: string): Promise<{ id: string } | undefined> { return undefined; }
export async function submitSupportTicket(_topic: SupportTopic, _message: string, _metadata: Record<string, unknown> = {}, _sourceScreen = 'app'): Promise<{ id: string } | undefined> { return undefined; }
