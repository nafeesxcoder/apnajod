import { describe, expect, it } from 'vitest';
import { buildPolicyComplianceSnapshot, type PolicyComplianceInput } from './policyCompliance';

const readyInput: PolicyComplianceInput = {
  hasReportFlow: true,
  hasBlockFlow: true,
  hasModerationQueue: true,
  hasCommunityGuidelines: true,
  hasAgeGate: true,
  hasAccountDeletion: true,
  hasPrivacyPolicy: true,
  hasDataSafetyDisclosure: true,
  hasSubscriptionDisclosure: true,
  hasLocationConsent: true,
  hasSafetyCheckIns: true,
};

describe('policy compliance', () => {
  it('marks the dating compliance pack ready when all critical controls exist', () => {
    const snapshot = buildPolicyComplianceSnapshot(readyInput);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.score).toBe(100);
    expect(snapshot.blockers).toEqual([]);
  });

  it('blocks store readiness when report/block controls are missing', () => {
    const snapshot = buildPolicyComplianceSnapshot({
      ...readyInput,
      hasReportFlow: false,
      hasBlockFlow: false,
    });

    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers.map((item) => item.id)).toEqual(['ugc_moderation', 'report_block']);
  });

  it('treats subscription transparency as critical for premium plans', () => {
    const snapshot = buildPolicyComplianceSnapshot({
      ...readyInput,
      hasSubscriptionDisclosure: false,
    });

    expect(snapshot.blockers.map((item) => item.id)).toContain('billing_transparency');
  });
});
