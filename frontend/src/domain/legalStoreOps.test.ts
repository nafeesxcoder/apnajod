import { describe, expect, it } from 'vitest';
import { buildLegalStoreOpsSnapshot, type LegalStoreOpsInput } from './legalStoreOps';

const readyInput: LegalStoreOpsInput = {
  privacyPolicyDrafted: true,
  termsDrafted: true,
  communityGuidelinesDrafted: true,
  companyDetailsFinal: true,
  legalReviewComplete: true,
  privacyUrlPublished: true,
  termsUrlPublished: true,
  supportUrlPublished: true,
  dataSafetyDrafted: true,
  appStorePrivacyLabelsReady: true,
  playDataSafetyReady: true,
  ageRatingReady: true,
  subscriptionDisclosureReady: true,
  accountDeletionReady: true,
  reviewerAccessReady: true,
  productionDemoGuardReady: true,
  supportContactReady: true,
};

describe('legal store operations', () => {
  it('blocks store submission when public legal URLs are not published', () => {
    const snapshot = buildLegalStoreOpsSnapshot({
      ...readyInput,
      privacyUrlPublished: false,
      termsUrlPublished: false,
      supportUrlPublished: false,
    });

    expect(snapshot.status).toBe('Needs public URLs');
    expect(snapshot.blockers.map((gate) => gate.id)).toContain('public_urls');
    expect(snapshot.nextBestStep).toContain('production website');
  });

  it('requires final company details and legal review even when drafts exist', () => {
    const snapshot = buildLegalStoreOpsSnapshot({
      ...readyInput,
      companyDetailsFinal: false,
      legalReviewComplete: false,
    });

    expect(snapshot.status).toBe('Needs legal review');
    expect(snapshot.blockers.map((gate) => gate.id)).toContain('legal_documents');
    expect(snapshot.score).toBeLessThan(100);
  });

  it('passes when legal docs, URLs, store labels, subscriptions and deletion are ready', () => {
    const snapshot = buildLegalStoreOpsSnapshot(readyInput);

    expect(snapshot.status).toBe('Ready for store submission');
    expect(snapshot.score).toBe(100);
    expect(snapshot.blockers).toEqual([]);
  });
});
