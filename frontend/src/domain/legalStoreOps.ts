export type LegalStoreOpsStatus = 'Ready for store submission' | 'Needs public URLs' | 'Needs legal review';

export type LegalStoreOpsGateId =
  | 'legal_documents'
  | 'public_urls'
  | 'data_safety_labels'
  | 'store_review_pack'
  | 'subscription_disclosure'
  | 'age_delete_controls';

export type LegalStoreOpsInput = {
  privacyPolicyDrafted: boolean;
  termsDrafted: boolean;
  communityGuidelinesDrafted: boolean;
  companyDetailsFinal: boolean;
  legalReviewComplete: boolean;
  privacyUrlPublished: boolean;
  termsUrlPublished: boolean;
  supportUrlPublished: boolean;
  dataSafetyDrafted: boolean;
  appStorePrivacyLabelsReady: boolean;
  playDataSafetyReady: boolean;
  ageRatingReady: boolean;
  subscriptionDisclosureReady: boolean;
  accountDeletionReady: boolean;
  reviewerAccessReady: boolean;
  productionDemoGuardReady: boolean;
  supportContactReady: boolean;
};

export type LegalStoreOpsGate = {
  id: LegalStoreOpsGateId;
  title: string;
  body: string;
  ready: boolean;
  started: boolean;
  nextStep: string;
};

export type LegalStoreOpsSnapshot = {
  status: LegalStoreOpsStatus;
  score: number;
  readyCount: number;
  total: number;
  blockers: LegalStoreOpsGate[];
  gates: LegalStoreOpsGate[];
  nextBestStep: string;
};

function scoreGate(gate: LegalStoreOpsGate) {
  if (gate.ready) return 100;
  if (gate.started) return 55;
  return 0;
}

export function buildLegalStoreOpsSnapshot(input: LegalStoreOpsInput): LegalStoreOpsSnapshot {
  const legalDocumentsStarted = input.privacyPolicyDrafted || input.termsDrafted || input.communityGuidelinesDrafted;
  const legalDocumentsReady = input.privacyPolicyDrafted &&
    input.termsDrafted &&
    input.communityGuidelinesDrafted &&
    input.companyDetailsFinal &&
    input.legalReviewComplete;
  const publicUrlsReady = input.privacyUrlPublished && input.termsUrlPublished && input.supportUrlPublished;
  const dataSafetyReady = input.dataSafetyDrafted && input.appStorePrivacyLabelsReady && input.playDataSafetyReady;
  const reviewPackReady = input.reviewerAccessReady && input.productionDemoGuardReady && input.supportContactReady;
  const ageDeleteReady = input.ageRatingReady && input.accountDeletionReady;

  const gates: LegalStoreOpsGate[] = [
    {
      id: 'legal_documents',
      title: 'Legal documents',
      body: legalDocumentsReady
        ? 'Privacy Policy, Terms and Community Guidelines have final company details and legal review.'
        : 'Drafts exist, but final company/contact details and legal review are still required.',
      ready: legalDocumentsReady,
      started: legalDocumentsStarted,
      nextStep: 'Finalize legal company name, support/legal/privacy emails, jurisdiction language and attorney review.',
    },
    {
      id: 'public_urls',
      title: 'Public HTTPS URLs',
      body: publicUrlsReady
        ? 'Privacy, Terms and Support URLs are published over HTTPS for store consoles.'
        : 'Store submission needs live HTTPS Privacy, Terms and Support URLs.',
      ready: publicUrlsReady,
      started: input.privacyUrlPublished || input.termsUrlPublished || input.supportUrlPublished,
      nextStep: 'Publish Privacy Policy, Terms and Support pages on the production website before submission.',
    },
    {
      id: 'data_safety_labels',
      title: 'Data Safety and privacy labels',
      body: dataSafetyReady
        ? 'Google Play Data Safety and App Store privacy labels match production behavior.'
        : 'Data Safety draft exists; final labels must match backend, analytics, payments and support tools.',
      ready: dataSafetyReady,
      started: input.dataSafetyDrafted || input.playDataSafetyReady || input.appStorePrivacyLabelsReady,
      nextStep: 'Complete App Store privacy labels and re-check Google Play Data Safety against actual providers.',
    },
    {
      id: 'store_review_pack',
      title: 'Reviewer pack',
      body: reviewPackReady
        ? 'Reviewer credentials, demo path, support contact and production demo guard are ready.'
        : 'Reviewers need a working account, clear test notes, support contact and no production demo loopholes.',
      ready: reviewPackReady,
      started: input.reviewerAccessReady || input.supportContactReady,
      nextStep: 'Prepare reviewer account, demo instructions, safety path and support contact for Play/App review.',
    },
    {
      id: 'subscription_disclosure',
      title: 'Subscription disclosure',
      body: input.subscriptionDisclosureReady
        ? 'Membership pricing, renewal, restore purchase and store-billing language are represented.'
        : 'Paid plans must disclose price, renewal, cancellation, restore purchase and platform billing rules.',
      ready: input.subscriptionDisclosureReady,
      started: input.subscriptionDisclosureReady,
      nextStep: 'Add final subscription product IDs and store-approved renewal/cancellation copy.',
    },
    {
      id: 'age_delete_controls',
      title: 'Age rating and deletion',
      body: ageDeleteReady
        ? 'Age/audience controls and in-app account deletion path are ready.'
        : 'Age rating, adult-audience declaration and backend deletion workflow must be finalized.',
      ready: ageDeleteReady,
      started: input.accountDeletionReady || input.ageRatingReady,
      nextStep: 'Finalize Play/App age rating declarations and connect delete-account requests to production backend.',
    },
  ];

  const blockers = gates.filter((gate) => !gate.ready);
  const readyCount = gates.length - blockers.length;
  const score = Math.round(gates.reduce((sum, gate) => sum + scoreGate(gate), 0) / gates.length);
  const status: LegalStoreOpsStatus = blockers.length === 0
    ? 'Ready for store submission'
    : !publicUrlsReady
      ? 'Needs public URLs'
      : 'Needs legal review';

  return {
    status,
    score,
    readyCount,
    total: gates.length,
    blockers,
    gates,
    nextBestStep: blockers[0]?.nextStep ?? 'Submit internal release candidate to store review after final provider keys are connected.',
  };
}
