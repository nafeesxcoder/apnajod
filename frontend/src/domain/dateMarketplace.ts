export type DateMarketplacePillarId =
  | 'real_venue_database'
  | 'restaurant_partnerships'
  | 'reservation_api'
  | 'date_safety'
  | 'date_packages'
  | 'community_events';

export type DateMarketplaceInput = {
  venueCount: number;
  cityCount: number;
  packageCount: number;
  eventCount: number;
  hasSearch: boolean;
  hasSafeFirstDateFilter: boolean;
  hasPartnerProgram: boolean;
  hasReservationApiPlan: boolean;
  hasSafetyCheckIns: boolean;
  hasIndianMixers: boolean;
  hasSpeedVideoEvents: boolean;
  hasPremiumDinners: boolean;
};

export type DateMarketplacePillar = {
  id: DateMarketplacePillarId;
  title: string;
  body: string;
  ready: boolean;
};

export type DateMarketplaceSnapshot = {
  ready: boolean;
  score: number;
  readyCount: number;
  total: number;
  blockers: DateMarketplacePillar[];
  pillars: DateMarketplacePillar[];
};

export function buildDateMarketplaceSnapshot(input: DateMarketplaceInput): DateMarketplaceSnapshot {
  const pillars: DateMarketplacePillar[] = [
    {
      id: 'real_venue_database',
      title: 'Real venue database',
      body: `${input.venueCount} curated venues across ${input.cityCount} cities with search and category filters.`,
      ready: input.venueCount >= 40 && input.cityCount >= 20 && input.hasSearch,
    },
    {
      id: 'restaurant_partnerships',
      title: 'Restaurant/café partnerships',
      body: 'Partner pipeline covers shortlist, agreement, package inventory, safety SLA and support handoff.',
      ready: input.hasPartnerProgram,
    },
    {
      id: 'reservation_api',
      title: 'Reservation API path',
      body: 'Reservation hold, quote, payment, confirmation and fallback copy are modeled before live provider keys.',
      ready: input.hasReservationApiPlan,
    },
    {
      id: 'date_safety',
      title: 'Date safety check-in',
      body: 'Safe public-place filter, trusted contact sharing and post-date check-ins are available.',
      ready: input.hasSafeFirstDateFilter && input.hasSafetyCheckIns,
    },
    {
      id: 'date_packages',
      title: 'Date packages',
      body: `${input.packageCount} ready-made packages make planning simple without making the date feel transactional.`,
      ready: input.packageCount >= 5,
    },
    {
      id: 'community_events',
      title: 'Mixers, speed dates, premium dinners',
      body: `${input.eventCount} event concepts include Indian community mixers, video speed dating and invite-only dinners.`,
      ready: input.hasIndianMixers && input.hasSpeedVideoEvents && input.hasPremiumDinners,
    },
  ];
  const blockers = pillars.filter((pillar) => !pillar.ready);
  const readyCount = pillars.length - blockers.length;
  return {
    ready: blockers.length === 0,
    score: Math.round((readyCount / pillars.length) * 100),
    readyCount,
    total: pillars.length,
    blockers,
    pillars,
  };
}
