import { describe, expect, it } from 'vitest';
import { buildAbuseFraudReadinessSnapshot, type AbuseFraudReadinessInput } from './abuseFraudReadiness';

const readyInput: AbuseFraudReadinessInput = {
  appEnvironment: 'production',
  romanceScamRulesReady: true,
  moneyOffAppLocationRulesReady: true,
  messageSafetyScannerReady: true,
  reportBlockFlowReady: true,
  blockGraphReady: true,
  roseSparkDailyLimitsReady: true,
  refundDisputeReviewReady: true,
  profileReverificationReady: true,
  trustedVouchReady: true,
  duplicateAccountRulesReady: true,
  deviceRiskProviderConnected: true,
  captchaRiskProviderConnected: true,
  adminFreezeActionsReady: true,
  evidenceAuditReady: true,
  appealSupportReady: true,
  safetyEducationReady: true,
  physicalDeviceQaReady: true,
  productionLocked: true,
};

describe('abuse and fraud readiness', () => {
  it('keeps core protection preview-ready while fraud providers are pending', () => {
    const snapshot = buildAbuseFraudReadinessSnapshot({
      ...readyInput,
      appEnvironment: 'preview',
      deviceRiskProviderConnected: false,
      captchaRiskProviderConnected: false,
      physicalDeviceQaReady: false,
      productionLocked: false,
    });

    expect(snapshot.status).toBe('Final fraud providers pending');
    expect(snapshot.coreProtectionScore).toBe(100);
    expect(snapshot.providerProtectionScore).toBe(0);
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(['fraud_providers', 'production_qa']);
  });

  it('blocks setup when scam rules, block graph and paid-action limits are incomplete', () => {
    const snapshot = buildAbuseFraudReadinessSnapshot({
      ...readyInput,
      moneyOffAppLocationRulesReady: false,
      reportBlockFlowReady: false,
      roseSparkDailyLimitsReady: false,
      duplicateAccountRulesReady: false,
      evidenceAuditReady: false,
      safetyEducationReady: false,
    });

    expect(snapshot.status).toBe('Abuse setup needed');
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'romance_scam_rules',
      'report_block_graph',
      'paid_action_abuse',
      'account_integrity',
      'freeze_evidence_actions',
      'member_education',
    ]));
  });

  it('passes when scam rules, fraud providers, enforcement and QA are ready', () => {
    const snapshot = buildAbuseFraudReadinessSnapshot(readyInput);

    expect(snapshot.status).toBe('Ready for safe scale');
    expect(snapshot.score).toBe(100);
    expect(snapshot.coreProtectionScore).toBe(100);
    expect(snapshot.providerProtectionScore).toBe(100);
    expect(snapshot.blockerCount).toBe(0);
  });
});
