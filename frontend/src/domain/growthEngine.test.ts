import { describe, expect, it } from 'vitest';
import { assignGrowthExperiment, buildConsentedGrowthEvent, buildGrowthEngineSnapshot, evaluateReferralReward, resolveLastNonDirectAttribution } from './growthEngine';

describe('growth engine operations', () => {
  it('drops analytics without consent and strips sensitive properties', () => {
    expect(buildConsentedGrowthEvent({ analyticsConsent: false, eventName: 'profile_verified', eventId: '1' })).toBeNull();
    expect(buildConsentedGrowthEvent({ analyticsConsent: true, eventName: 'profile_verified', eventId: '1', properties: { city_key: 'toronto', email: 'private@example.com', message: 'private' } })).toEqual({ eventName: 'profile_verified', eventId: '1', properties: { city_key: 'toronto' } });
  });

  it('uses last non-direct attribution inside the conversion window', () => {
    const result = resolveLastNonDirectAttribution([
      { channel: 'direct', direct: true, occurredAt: '2026-07-15T00:00:00Z' },
      { channel: 'ambassador', campaignKey: 'toronto-1', occurredAt: '2026-07-10T00:00:00Z' },
      { channel: 'paid-social', occurredAt: '2026-05-01T00:00:00Z' },
    ], '2026-07-16T00:00:00Z');
    expect(result?.channel).toBe('ambassador');
  });

  it('assigns a stable experiment only when consent, safety and city density pass', () => {
    const base = { subjectKey: 'member-1', experimentKey: 'onboarding-v1', variants: [{ key: 'control', allocationPercent: 50 }, { key: 'intent-first', allocationPercent: 50 }], analyticsConsent: true, safetyGuardrailReady: true, cityDensityReady: true } as const;
    expect(assignGrowthExperiment(base)).toEqual(assignGrowthExperiment(base));
    expect(assignGrowthExperiment({ ...base, safetyGuardrailReady: false })).toBeNull();
    expect(assignGrowthExperiment({ ...base, analyticsConsent: false })).toBeNull();
  });

  it('rewards only distinct, verified, activated and fraud-cleared referrals once', () => {
    const base = { inviterId: 'a', inviteeId: 'b', inviteeVerified: true, inviteeActivated: true, fraudCleared: true, sharedRiskIdentity: false, alreadyRewarded: false, convertedAt: '2026-07-16T00:00:00Z', expiresAt: '2026-08-01T00:00:00Z' };
    expect(evaluateReferralReward(base)).toEqual({ eligible: true, reason: 'eligible' });
    expect(evaluateReferralReward({ ...base, inviteeVerified: false }).reason).toBe('not_verified');
    expect(evaluateReferralReward({ ...base, sharedRiskIdentity: true }).reason).toBe('shared_risk_identity');
    expect(evaluateReferralReward({ ...base, alreadyRewarded: true }).reason).toBe('already_rewarded');
  });

  it('never presents source-only growth contracts as live evidence', () => {
    const snapshot = buildGrowthEngineSnapshot({ liveInstrumentationConnected: false, mappedEvents: 9, liveEventCount: 0, attributionConnected: false, experimentRegistryConnected: false, cohortDashboardConnected: false, referralVerificationConnected: false, activeExperiments: 0, verifiedConversions: 0, serverVerifiedOutcomesReady: true, campaignGovernanceReady: true, experimentSafetyControlsReady: true, referralRiskLedgerReady: true, consentWithdrawalReady: true, cohortProvenanceReady: true });
    expect(snapshot.status).toBe('Source model only');
    expect(snapshot.score).toBe(0);
    expect(snapshot.funnelCoverage).toBe(100);
    expect(snapshot.sourceControlScore).toBe(100);
  });
});
