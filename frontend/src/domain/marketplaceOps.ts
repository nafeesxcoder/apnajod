export type MarketplaceOpsStatus = 'Ready for live ops' | 'Provider connections pending' | 'Ops setup needed';

export type MarketplaceOpsPillarId =
  | 'partner_crm'
  | 'provider_adapter'
  | 'booking_lifecycle'
  | 'inventory_freshness'
  | 'checkout_refunds'
  | 'webhook_reconciliation'
  | 'safety_sla'
  | 'event_capacity'
  | 'city_coverage';

export type MarketplaceCityCoverage = {
  city: string;
  partnerLeads: number;
  signedPartners: number;
  eventHosts: number;
  monthlyEvents: number;
  capacitySeats: number;
};

export type MarketplaceOpsInput = {
  venueCount: number;
  curatedCityCount: number;
  datePackageCount: number;
  partnerLeadCount: number;
  signedPartnerCount: number;
  livePlacesProviderConnected: boolean;
  reservationProviderConnected: boolean;
  bookingLifecycleReady: boolean;
  inventoryFreshnessReady: boolean;
  paymentWebhookConnected: boolean;
  webhookReconciliationReady: boolean;
  refundPolicyReady: boolean;
  supportSlaHours: number;
  safetyStaffingReady: boolean;
  eventHostCount: number;
  eventConceptCount: number;
  cityCoverage: readonly MarketplaceCityCoverage[];
  partnerComplianceReady: boolean;
  atomicInventoryHoldReady: boolean;
  serverRefundCaseReady: boolean;
  reconciliationCaseReady: boolean;
};

export type MarketplaceOpsPillar = {
  id: MarketplaceOpsPillarId;
  title: string;
  body: string;
  ready: boolean;
  nextStep: string;
};

export type MarketplaceOpsSnapshot = {
  status: MarketplaceOpsStatus;
  score: number;
  readyCount: number;
  total: number;
  blockers: MarketplaceOpsPillar[];
  pillars: MarketplaceOpsPillar[];
  cityCoverage: MarketplaceCityCoverage[];
  nextBestStep: string;
  sourceControlScore: number;
  sourceControlReady: number;
  sourceControlTotal: number;
};

function readinessScore(ready: boolean, started: boolean) {
  if (ready) return 100;
  if (started) return 55;
  return 0;
}

export function buildMarketplaceOpsSnapshot(input: MarketplaceOpsInput): MarketplaceOpsSnapshot {
  const launchCitiesCovered = input.cityCoverage.length >= 5 && input.cityCoverage.every((city) =>
    city.partnerLeads >= 3 && city.eventHosts >= 1 && city.monthlyEvents >= 1 && city.capacitySeats >= 24
  );
  const signedDensityReady = input.cityCoverage.every((city) => city.signedPartners >= 1);
  const partnerCrmReady = input.partnerLeadCount >= 25 && input.signedPartnerCount >= 5 && input.datePackageCount >= 5;
  const providerReady = input.livePlacesProviderConnected && input.reservationProviderConnected;
  const bookingLifecycleReady = input.bookingLifecycleReady;
  const inventoryFreshnessReady = input.inventoryFreshnessReady && input.livePlacesProviderConnected && input.reservationProviderConnected;
  const checkoutReady = input.paymentWebhookConnected && input.refundPolicyReady;
  const reconciliationReady = input.webhookReconciliationReady && input.paymentWebhookConnected && input.reservationProviderConnected;
  const safetyReady = input.safetyStaffingReady && input.supportSlaHours <= 24;
  const eventReady = input.eventHostCount >= 5 && input.eventConceptCount >= 6;
  const cityReady = launchCitiesCovered && signedDensityReady;

  const pillars: MarketplaceOpsPillar[] = [
    {
      id: 'partner_crm',
      title: 'Partner CRM and contracts',
      body: `${input.partnerLeadCount} venue leads · ${input.signedPartnerCount} signed partners · ${input.datePackageCount} package templates.`,
      ready: partnerCrmReady,
      nextStep: 'Sign at least 5 launch partners and attach package menus, support contact and cancellation terms.',
    },
    {
      id: 'provider_adapter',
      title: 'Places + reservation adapter',
      body: input.livePlacesProviderConnected && input.reservationProviderConnected
        ? 'Live places and reservation providers are connected.'
        : 'Preview data exists; live places/hours/ratings and reservation holds still need provider keys.',
      ready: providerReady,
      nextStep: 'Pick Google Places/Yelp-style places provider and OpenTable/SevenRooms/Resy-style reservation provider.',
    },
    {
      id: 'booking_lifecycle',
      title: 'Booking lifecycle',
      body: bookingLifecycleReady ? 'Quote, both-member acceptance, payment preparation, confirmation, cancellation and refund states are modeled.' : 'A complete server-owned booking state machine is required.',
      ready: bookingLifecycleReady,
      nextStep: 'Implement and test every allowed booking transition and exception path.',
    },
    {
      id: 'inventory_freshness',
      title: 'Inventory freshness',
      body: inventoryFreshnessReady ? 'Provider-synced availability and expiring server-priced quotes are enforced.' : 'Source freshness rules exist; live provider availability is not connected.',
      ready: inventoryFreshnessReady,
      nextStep: 'Connect provider inventory and reject slots not synced within 15 minutes.',
    },
    {
      id: 'checkout_refunds',
      title: 'Payment webhooks and refunds',
      body: input.paymentWebhookConnected && input.refundPolicyReady
        ? 'Payment, refund and cancellation policies are ready for date holds.'
        : 'Date holds need server-side payment webhooks, refund rules and cancellation copy.',
      ready: checkoutReady,
      nextStep: 'Connect the AWS payments adapter and wallet webhook, then publish the refund/cancellation policy.',
    },
    {
      id: 'webhook_reconciliation',
      title: 'Webhook reconciliation',
      body: reconciliationReady ? 'Signed idempotent webhooks and provider/payment reconciliation are operational.' : 'Signed webhook contracts exist; live delivery, alerts and reconciliation evidence are pending.',
      ready: reconciliationReady,
      nextStep: 'Deploy signed webhooks, schedule reconciliation and alert on amount or status mismatch.',
    },
    {
      id: 'safety_sla',
      title: 'Safety and support SLA',
      body: `Support SLA target: ${input.supportSlaHours}h. Safety staffing ${input.safetyStaffingReady ? 'ready' : 'not staffed yet'}.`,
      ready: safetyReady,
      nextStep: 'Staff safety/support coverage and commit to sub-24h marketplace support for date incidents.',
    },
    {
      id: 'event_capacity',
      title: 'Event host and capacity ops',
      body: `${input.eventHostCount} hosts · ${input.eventConceptCount} event concepts across mixers, video dates and premium dinners.`,
      ready: eventReady,
      nextStep: 'Assign at least 5 trained hosts and define capacity, check-in, refund and no-show rules.',
    },
    {
      id: 'city_coverage',
      title: 'Launch-city coverage',
      body: `${input.cityCoverage.length} launch-city ops plans with partner leads, hosts, events and capacity.`,
      ready: cityReady,
      nextStep: 'Make sure every launch city has 3+ leads, 1 signed partner, 1 host, 1 monthly event and 24+ seats.',
    },
  ];

  const blockers = pillars.filter((pillar) => !pillar.ready);
  const readyCount = pillars.length - blockers.length;
  const score = Math.round((
    readinessScore(partnerCrmReady, input.partnerLeadCount > 0) +
    readinessScore(providerReady, input.venueCount > 0 && input.curatedCityCount > 0) +
    readinessScore(bookingLifecycleReady, bookingLifecycleReady) +
    readinessScore(inventoryFreshnessReady, input.inventoryFreshnessReady) +
    readinessScore(checkoutReady, input.paymentWebhookConnected || input.refundPolicyReady) +
    readinessScore(reconciliationReady, input.webhookReconciliationReady) +
    readinessScore(safetyReady, input.supportSlaHours <= 48 || input.safetyStaffingReady) +
    readinessScore(eventReady, input.eventConceptCount > 0) +
    readinessScore(cityReady, launchCitiesCovered)
  ) / pillars.length);
  const providerBlockersOnly = blockers.every((pillar) => ['provider_adapter', 'inventory_freshness', 'checkout_refunds', 'webhook_reconciliation', 'safety_sla'].includes(pillar.id));
  const sourceControls = [input.bookingLifecycleReady,input.inventoryFreshnessReady,input.partnerComplianceReady,input.atomicInventoryHoldReady,input.serverRefundCaseReady,input.reconciliationCaseReady];
  const sourceControlReady = sourceControls.filter(Boolean).length;

  return {
    status: blockers.length === 0 ? 'Ready for live ops' : providerBlockersOnly ? 'Provider connections pending' : 'Ops setup needed',
    score,
    readyCount,
    total: pillars.length,
    blockers,
    pillars,
    cityCoverage: [...input.cityCoverage],
    nextBestStep: blockers[0]?.nextStep ?? 'Begin closed launch with real venue inventory and staffed safety operations.',
    sourceControlScore: Math.round(sourceControlReady/sourceControls.length*100),
    sourceControlReady,
    sourceControlTotal: sourceControls.length,
  };
}
