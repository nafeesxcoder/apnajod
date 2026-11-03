export const growthFunnelEvents = [
  'signup_started',
  'profile_verified',
  'profile_completed',
  'qualified_introduction_viewed',
  'mutual_match_created',
  'meaningful_conversation_reached',
  'date_plan_accepted',
  'date_outcome_submitted',
  'member_retained_week_8',
] as const;

export type GrowthFunnelEvent = (typeof growthFunnelEvents)[number];
export type GrowthEngineStatus = 'Source model only' | 'Instrumentation incomplete' | 'Ready for controlled experiments';

export const growthAllowedProperties = [
  'city_key', 'cohort_key', 'acquisition_channel', 'campaign_key', 'experiment_key',
  'variant_key', 'screen_key', 'intent_key', 'days_since_signup', 'count_bucket',
] as const;

const forbiddenPropertyFragments = ['name', 'email', 'phone', 'message', 'photo', 'latitude', 'longitude', 'address', 'profile_id', 'match_id', 'otp'];

export function sanitizeGrowthProperties(properties: Record<string, unknown>): Record<string, string | number | boolean> {
  const allowed = new Set<string>(growthAllowedProperties);
  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!allowed.has(key) || forbiddenPropertyFragments.some((fragment) => key.toLowerCase().includes(fragment))) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') sanitized[key] = value;
  }
  return sanitized;
}

export function buildConsentedGrowthEvent(input: {
  analyticsConsent: boolean;
  eventName: GrowthFunnelEvent;
  eventId: string;
  properties?: Record<string, unknown>;
}) {
  if (!input.analyticsConsent || !growthFunnelEvents.includes(input.eventName)) return null;
  return { eventName: input.eventName, eventId: input.eventId, properties: sanitizeGrowthProperties(input.properties ?? {}) };
}

export type AttributionTouch = {
  channel: string;
  campaignKey?: string;
  occurredAt: string;
  direct?: boolean;
};

export function resolveLastNonDirectAttribution(touches: readonly AttributionTouch[], convertedAt: string, windowDays = 30) {
  const conversionTime = Date.parse(convertedAt);
  const cutoff = conversionTime - windowDays * 24 * 60 * 60 * 1000;
  return [...touches]
    .filter((touch) => !touch.direct && Date.parse(touch.occurredAt) >= cutoff && Date.parse(touch.occurredAt) <= conversionTime)
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))[0] ?? null;
}

function stableBucket(subjectKey: string, experimentKey: string) {
  let hash = 2166136261;
  for (const character of `${experimentKey}:${subjectKey}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 10000;
}

export function assignGrowthExperiment(input: {
  subjectKey: string;
  experimentKey: string;
  variants: readonly { key: string; allocationPercent: number }[];
  analyticsConsent: boolean;
  safetyGuardrailReady: boolean;
  cityDensityReady: boolean;
}) {
  if (!input.analyticsConsent || !input.safetyGuardrailReady || !input.cityDensityReady) return null;
  const bucket = stableBucket(input.subjectKey, input.experimentKey) / 100;
  let cursor = 0;
  for (const variant of input.variants) {
    cursor += variant.allocationPercent;
    if (bucket < cursor) return { experimentKey: input.experimentKey, variantKey: variant.key, bucket };
  }
  return null;
}

export type ReferralRewardEligibility = {
  eligible: boolean;
  reason: 'eligible' | 'self_referral' | 'not_verified' | 'not_activated' | 'fraud_review' | 'shared_risk_identity' | 'already_rewarded' | 'expired';
};

export function evaluateReferralReward(input: {
  inviterId: string;
  inviteeId: string;
  inviteeVerified: boolean;
  inviteeActivated: boolean;
  fraudCleared: boolean;
  sharedRiskIdentity: boolean;
  alreadyRewarded: boolean;
  convertedAt: string;
  expiresAt: string;
}): ReferralRewardEligibility {
  if (input.inviterId === input.inviteeId) return { eligible: false, reason: 'self_referral' };
  if (!input.inviteeVerified) return { eligible: false, reason: 'not_verified' };
  if (!input.inviteeActivated) return { eligible: false, reason: 'not_activated' };
  if (!input.fraudCleared) return { eligible: false, reason: 'fraud_review' };
  if (input.sharedRiskIdentity) return { eligible: false, reason: 'shared_risk_identity' };
  if (input.alreadyRewarded) return { eligible: false, reason: 'already_rewarded' };
  if (Date.parse(input.convertedAt) > Date.parse(input.expiresAt)) return { eligible: false, reason: 'expired' };
  return { eligible: true, reason: 'eligible' };
}

export type GrowthEngineSnapshot = {
  status: GrowthEngineStatus;
  score: number;
  sourceControlScore: number;
  sourceControlReady: number;
  sourceControlTotal: number;
  funnelCoverage: number;
  liveEventCount: number;
  activeExperiments: number;
  verifiedConversions: number;
  blockers: string[];
  nextBestStep: string;
};

export function buildGrowthEngineSnapshot(input: {
  liveInstrumentationConnected: boolean;
  mappedEvents: number;
  liveEventCount: number;
  attributionConnected: boolean;
  experimentRegistryConnected: boolean;
  cohortDashboardConnected: boolean;
  referralVerificationConnected: boolean;
  activeExperiments: number;
  verifiedConversions: number;
  serverVerifiedOutcomesReady: boolean;
  campaignGovernanceReady: boolean;
  experimentSafetyControlsReady: boolean;
  referralRiskLedgerReady: boolean;
  consentWithdrawalReady: boolean;
  cohortProvenanceReady: boolean;
}): GrowthEngineSnapshot {
  const funnelCoverage = Math.min(100, Math.round((input.mappedEvents / growthFunnelEvents.length) * 100));
  const blockers: string[] = [];
  if (!input.liveInstrumentationConnected) blockers.push('Connect consented production event delivery.');
  if (!input.attributionConnected) blockers.push('Verify acquisition attribution from first touch through retained member.');
  if (!input.experimentRegistryConnected) blockers.push('Deploy experiment assignment, exposure and decision logging.');
  if (!input.cohortDashboardConnected) blockers.push('Build city/cohort activation and eight-week retention dashboards.');
  if (!input.referralVerificationConnected) blockers.push('Process referral rewards only after verified activation and fraud review.');
  const ready = blockers.length === 0 && funnelCoverage === 100;
  const sourceControls = [
    input.serverVerifiedOutcomesReady,
    input.campaignGovernanceReady,
    input.experimentSafetyControlsReady,
    input.referralRiskLedgerReady,
    input.consentWithdrawalReady,
    input.cohortProvenanceReady,
  ];
  const sourceControlReady = sourceControls.filter(Boolean).length;
  const sourceControlTotal = sourceControls.length;
  const sourceControlScore = Math.round(sourceControlReady / sourceControlTotal * 100);
  const score = input.liveInstrumentationConnected ? Math.round([
    funnelCoverage === 100, input.attributionConnected, input.experimentRegistryConnected,
    input.cohortDashboardConnected, input.referralVerificationConnected,
  ].filter(Boolean).length / 5 * 100) : 0;
  return {
    status: !input.liveInstrumentationConnected ? 'Source model only' : ready ? 'Ready for controlled experiments' : 'Instrumentation incomplete',
    score,
    sourceControlScore,
    sourceControlReady,
    sourceControlTotal,
    funnelCoverage,
    liveEventCount: input.liveEventCount,
    activeExperiments: input.activeExperiments,
    verifiedConversions: input.verifiedConversions,
    blockers,
    nextBestStep: blockers[0] ?? 'Run one city-level experiment with retention and safety guardrails before scaling spend.',
  };
}
