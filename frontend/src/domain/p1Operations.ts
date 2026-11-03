export type P1OperationAreaId =
  | 'live_date_marketplace'
  | 'city_growth_backend'
  | 'indian_events_ops'
  | 'community_ambassadors'
  | 'admin_trust_ops'
  | 'legal_store_ops';

export type P1OperationStatus = 'ready' | 'started' | 'blocked';

export type P1OperationItem = {
  id: P1OperationAreaId;
  title: string;
  body: string;
  status: P1OperationStatus;
  storeCritical: boolean;
  nextStep: string;
};

export type P1OperationsInput = {
  hasDateMarketplacePreview: boolean;
  hasLiveVenueProvider: boolean;
  hasReservationProvider: boolean;
  launchCityCount: number;
  hasWaitlistModel: boolean;
  hasReferralRewards: boolean;
  hasAmbassadorModel: boolean;
  hasIndianEvents: boolean;
  hasAlumniGroups: boolean;
  hasSuccessStoriesModel: boolean;
  hasTrustOpsQueue: boolean;
  hasSupportSla: boolean;
  hasLegalDrafts: boolean;
  legalUrlsPublished: boolean;
};

export type P1OperationsSnapshot = {
  score: number;
  readyCount: number;
  startedCount: number;
  blockedCount: number;
  total: number;
  status: 'P1 ready' | 'P1 in progress' | 'P1 blocked';
  blockers: P1OperationItem[];
  nextBestStep: string;
  items: P1OperationItem[];
};

function itemStatus(requiredReady: boolean, previewStarted: boolean): P1OperationStatus {
  if (requiredReady) return 'ready';
  if (previewStarted) return 'started';
  return 'blocked';
}

function weightedScore(status: P1OperationStatus) {
  if (status === 'ready') return 100;
  if (status === 'started') return 55;
  return 0;
}

export function buildP1OperationsSnapshot(input: P1OperationsInput): P1OperationsSnapshot {
  const items: P1OperationItem[] = [
    {
      id: 'live_date_marketplace',
      title: 'Live venue/date marketplace',
      body: input.hasLiveVenueProvider && input.hasReservationProvider
        ? 'Live venues, hours, reservations and package holds are ready.'
        : 'Marketplace UI is ready; live venue/reservation providers still need connection.',
      status: itemStatus(input.hasLiveVenueProvider && input.hasReservationProvider, input.hasDateMarketplacePreview),
      storeCritical: false,
      nextStep: 'Choose Google Places/Yelp-style venue provider plus reservation adapter for launch cities.',
    },
    {
      id: 'city_growth_backend',
      title: 'City growth backend',
      body: `${input.launchCityCount} launch cities modeled with waitlist/referral/friend-density loops.`,
      status: itemStatus(input.hasWaitlistModel && input.hasReferralRewards && input.launchCityCount >= 5, input.launchCityCount > 0),
      storeCritical: false,
      nextStep: 'Create waitlist/referral tables and city-density admin dashboard.',
    },
    {
      id: 'indian_events_ops',
      title: 'Indian professional events',
      body: 'Mixers, alumni/professional groups, speed dates and premium dinners should have capacity and host ops.',
      status: itemStatus(input.hasIndianEvents && input.hasAlumniGroups && input.hasSuccessStoriesModel, input.hasIndianEvents || input.hasAlumniGroups),
      storeCritical: false,
      nextStep: 'Assign hosts, event capacity, refund policy and post-event success-story collection.',
    },
    {
      id: 'community_ambassadors',
      title: 'Community ambassadors',
      body: 'Ambassadors seed trust from temples, gurdwaras, alumni groups and professional circles.',
      status: itemStatus(input.hasAmbassadorModel && input.hasReferralRewards, input.hasAmbassadorModel),
      storeCritical: false,
      nextStep: 'Add ambassador invite codes, city ownership and quality guardrails.',
    },
    {
      id: 'admin_trust_ops',
      title: 'Admin / Trust Ops',
      body: 'Reports, moderation queue, support tickets and operational SLAs must be staffed before growth.',
      status: itemStatus(input.hasTrustOpsQueue && input.hasSupportSla, input.hasTrustOpsQueue),
      storeCritical: true,
      nextStep: 'Define reviewer roles, SLA ownership, escalation paths and support coverage.',
    },
    {
      id: 'legal_store_ops',
      title: 'Legal / store ops',
      body: input.legalUrlsPublished
        ? 'Legal URLs are represented for store review.'
        : 'Legal drafts exist but public URLs and final review are still required.',
      status: itemStatus(input.hasLegalDrafts && input.legalUrlsPublished, input.hasLegalDrafts),
      storeCritical: true,
      nextStep: 'Finalize company details, publish privacy/terms/community URLs and match store disclosures.',
    },
  ];

  const readyCount = items.filter((item) => item.status === 'ready').length;
  const startedCount = items.filter((item) => item.status === 'started').length;
  const blockedCount = items.filter((item) => item.status === 'blocked').length;
  const total = items.length;
  const score = Math.round(items.reduce((sum, item) => sum + weightedScore(item.status), 0) / total);
  const blockers = items.filter((item) => item.status !== 'ready');
  const nextBestStep = blockers.find((item) => item.storeCritical)?.nextStep ?? blockers[0]?.nextStep ?? 'Begin closed-city launch testing.';

  return {
    score,
    readyCount,
    startedCount,
    blockedCount,
    total,
    status: blockedCount ? 'P1 blocked' : startedCount ? 'P1 in progress' : 'P1 ready',
    blockers,
    nextBestStep,
    items,
  };
}
