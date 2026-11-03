export type PlacesReservationLaunchStatus = 'Ready for live reservations' | 'Final venue providers pending' | 'Places setup needed';

export type PlacesReservationGateId =
  | 'curated_inventory'
  | 'places_provider'
  | 'reservation_provider'
  | 'packages_partners'
  | 'safety_location'
  | 'payments_refunds'
  | 'support_operations'
  | 'production_qa';

export type PlacesReservationReadinessInput = {
  appEnvironment: string;
  venueCount: number;
  cityCount: number;
  categoryCount: number;
  packageCount: number;
  partnerLeadCount: number;
  signedPartnerCount: number;
  hasSearch: boolean;
  hasSafeFirstDateFilter: boolean;
  hasLocationConsent: boolean;
  hasSafetyCheckIns: boolean;
  livePlacesProviderConnected: boolean;
  hasHoursRatingsMaps: boolean;
  reservationProviderConnected: boolean;
  reservationHoldFlowReady: boolean;
  availabilitySyncReady: boolean;
  paymentWebhookConnected: boolean;
  refundPolicyReady: boolean;
  supportSlaHours: number;
  safetyStaffingReady: boolean;
  deepLinkRoutesReady: boolean;
  physicalDeviceQaReady: boolean;
  productionLocked: boolean;
};

export type PlacesReservationGate = {
  id: PlacesReservationGateId;
  title: string;
  body: string;
  ready: boolean;
  started: boolean;
  nextStep: string;
};

export type PlacesReservationReadinessSnapshot = {
  status: PlacesReservationLaunchStatus;
  score: number;
  readyCount: number;
  total: number;
  venueCount: number;
  cityCount: number;
  partnerCoverage: number;
  blockerCount: number;
  blockers: PlacesReservationGate[];
  gates: PlacesReservationGate[];
  nextBestStep: string;
};

function gateScore(gate: PlacesReservationGate) {
  if (gate.ready) return 100;
  if (gate.started) return 55;
  return 0;
}

export function buildPlacesReservationReadinessSnapshot(input: PlacesReservationReadinessInput): PlacesReservationReadinessSnapshot {
  const inventoryReady = input.venueCount >= 40 && input.cityCount >= 20 && input.categoryCount >= 8 && input.hasSearch && input.hasSafeFirstDateFilter;
  const placesProviderReady = input.livePlacesProviderConnected && input.hasHoursRatingsMaps;
  const reservationReady = input.reservationProviderConnected && input.reservationHoldFlowReady && input.availabilitySyncReady;
  const partnerCoverage = input.cityCount ? Math.round((input.signedPartnerCount / Math.min(input.cityCount, 5)) * 100) : 0;
  const packagesReady = input.packageCount >= 5 && input.partnerLeadCount >= 25 && input.signedPartnerCount >= 5;
  const safetyReady = input.hasLocationConsent && input.hasSafetyCheckIns && input.hasSafeFirstDateFilter;
  const paymentsReady = input.paymentWebhookConnected && input.refundPolicyReady;
  const supportReady = input.supportSlaHours <= 48 && input.safetyStaffingReady;
  const qaReady = input.physicalDeviceQaReady && input.deepLinkRoutesReady && input.productionLocked && input.appEnvironment === 'production';

  const gates: PlacesReservationGate[] = [
    {
      id: 'curated_inventory',
      title: 'Curated venue inventory',
      body: `${input.venueCount} venues · ${input.cityCount} cities · ${input.categoryCount} categories with search and safe-first-date filters.`,
      ready: inventoryReady,
      started: input.venueCount > 0 && input.cityCount > 0,
      nextStep: 'Keep expanding verified public venues and category filters for each launch city.',
    },
    {
      id: 'places_provider',
      title: 'Live places provider',
      body: placesProviderReady
        ? 'Live hours, ratings, maps and place details are provider-backed.'
        : 'Curated preview exists; live venue hours, ratings, maps and closed-place checks still need provider keys.',
      ready: placesProviderReady,
      started: input.livePlacesProviderConnected || input.hasHoursRatingsMaps,
      nextStep: 'Connect Google Places/Yelp/Tripadvisor-style provider for live hours, ratings, photos and maps.',
    },
    {
      id: 'reservation_provider',
      title: 'Reservation provider',
      body: reservationReady
        ? 'Reservation provider, availability sync and hold flow are ready.'
        : 'Date reservations need a provider adapter for availability, holds, confirmation, cancellation and fallback copy.',
      ready: reservationReady,
      started: input.reservationHoldFlowReady || input.reservationProviderConnected,
      nextStep: 'Connect OpenTable/SevenRooms/Resy/Toast-style provider and test availability holds.',
    },
    {
      id: 'packages_partners',
      title: 'Date packages and partners',
      body: `${input.packageCount} package(s), ${input.partnerLeadCount} venue lead(s), ${input.signedPartnerCount} signed partner(s).`,
      ready: packagesReady,
      started: input.packageCount > 0 || input.partnerLeadCount > 0,
      nextStep: 'Sign launch partners with package menus, cancellation terms, support contact and check-in procedure.',
    },
    {
      id: 'safety_location',
      title: 'Safety and approximate location',
      body: safetyReady
        ? 'Approximate location, safe-place filters and date check-ins are represented.'
        : 'Offline dates need foreground-only approximate location, public-place rules and check-in reminders.',
      ready: safetyReady,
      started: input.hasLocationConsent || input.hasSafetyCheckIns,
      nextStep: 'Keep exact location hidden, require public-first-date copy and enforce safety check-ins.',
    },
    {
      id: 'payments_refunds',
      title: 'Date hold payments and refunds',
      body: paymentsReady
        ? 'Reservation payment webhooks and refund/cancellation policy are ready.'
        : 'Reservation holds need server-side payment webhooks, refund/cancellation rules and receipt trail.',
      ready: paymentsReady,
      started: input.paymentWebhookConnected || input.refundPolicyReady,
      nextStep: 'Connect the AWS payments adapter and wallet webhooks, then publish refund/cancellation policy for failed holds.',
    },
    {
      id: 'support_operations',
      title: 'Support and safety operations',
      body: `Support SLA target ${input.supportSlaHours}h · safety staffing ${input.safetyStaffingReady ? 'ready' : 'pending'}.`,
      ready: supportReady,
      started: input.supportSlaHours <= 48,
      nextStep: 'Staff marketplace support and define escalation for no-show, harassment, venue issue, refund and safety incidents.',
    },
    {
      id: 'production_qa',
      title: 'Deep links and production QA',
      body: qaReady
        ? 'Date plans, map/deep links, payment holds and provider fallbacks are tested on physical devices.'
        : 'Live reservations need iOS/Android tests for maps, provider failures, denied location, app resume and expired holds.',
      ready: qaReady,
      started: input.deepLinkRoutesReady || input.physicalDeviceQaReady || input.productionLocked,
      nextStep: 'Run physical-device QA for venue search, date plan send, map links, payment hold, cancellation and provider downtime.',
    },
  ];

  const blockers = gates.filter((gate) => !gate.ready);
  const readyCount = gates.length - blockers.length;
  const setupBlockerIds: PlacesReservationGateId[] = ['curated_inventory', 'packages_partners', 'safety_location', 'support_operations'];
  const hasSetupBlocker = blockers.some((gate) => setupBlockerIds.includes(gate.id));

  return {
    status: blockers.length === 0 ? 'Ready for live reservations' : hasSetupBlocker ? 'Places setup needed' : 'Final venue providers pending',
    score: Math.round(gates.reduce((sum, gate) => sum + gateScore(gate), 0) / gates.length),
    readyCount,
    total: gates.length,
    venueCount: input.venueCount,
    cityCount: input.cityCount,
    partnerCoverage,
    blockerCount: blockers.length,
    blockers,
    gates,
    nextBestStep: blockers[0]?.nextStep ?? 'Run live reservation smoke tests with provider sandbox, safety check-ins, payment holds and support exceptions.',
  };
}
