import { describe, expect, it } from 'vitest';
import { buildMarketplaceOpsSnapshot, type MarketplaceOpsInput } from './marketplaceOps';

const launchCoverage = [
  { city: 'Delhi NCR', partnerLeads: 8, signedPartners: 1, eventHosts: 1, monthlyEvents: 2, capacitySeats: 80 },
  { city: 'Mumbai', partnerLeads: 6, signedPartners: 1, eventHosts: 1, monthlyEvents: 1, capacitySeats: 48 },
  { city: 'Hyderabad', partnerLeads: 5, signedPartners: 1, eventHosts: 1, monthlyEvents: 1, capacitySeats: 42 },
  { city: 'Bengaluru', partnerLeads: 7, signedPartners: 1, eventHosts: 1, monthlyEvents: 2, capacitySeats: 90 },
  { city: 'Pune', partnerLeads: 4, signedPartners: 1, eventHosts: 1, monthlyEvents: 1, capacitySeats: 32 },
] as const;

const readyInput: MarketplaceOpsInput = {
  venueCount: 43,
  curatedCityCount: 21,
  datePackageCount: 6,
  partnerLeadCount: 30,
  signedPartnerCount: 5,
  livePlacesProviderConnected: true,
  reservationProviderConnected: true,
  bookingLifecycleReady: true,
  inventoryFreshnessReady: true,
  paymentWebhookConnected: true,
  webhookReconciliationReady: true,
  refundPolicyReady: true,
  supportSlaHours: 12,
  safetyStaffingReady: true,
  eventHostCount: 5,
  eventConceptCount: 8,
  cityCoverage: launchCoverage,
  partnerComplianceReady: true,
  atomicInventoryHoldReady: true,
  serverRefundCaseReady: true,
  reconciliationCaseReady: true,
};

describe('marketplace operations', () => {
  it('blocks live claims when providers and SLA are not connected', () => {
    const snapshot = buildMarketplaceOpsSnapshot({
      ...readyInput,
      livePlacesProviderConnected: false,
      reservationProviderConnected: false,
      paymentWebhookConnected: false,
      refundPolicyReady: false,
      supportSlaHours: 48,
      safetyStaffingReady: false,
    });

    expect(snapshot.status).toBe('Provider connections pending');
    expect(snapshot.blockers.map((pillar) => pillar.id)).toEqual(['provider_adapter', 'inventory_freshness', 'checkout_refunds', 'webhook_reconciliation', 'safety_sla']);
    expect(snapshot.nextBestStep).toContain('places provider');
  });

  it('detects weak city coverage before a city-by-city launch', () => {
    const snapshot = buildMarketplaceOpsSnapshot({
      ...readyInput,
      cityCoverage: [
        ...launchCoverage.slice(0, 4),
        { city: 'Pune', partnerLeads: 1, signedPartners: 0, eventHosts: 0, monthlyEvents: 0, capacitySeats: 0 },
      ],
    });

    expect(snapshot.status).toBe('Ops setup needed');
    expect(snapshot.blockers.map((pillar) => pillar.id)).toContain('city_coverage');
  });

  it('passes once partner, provider, event, safety, and city ops are ready', () => {
    const snapshot = buildMarketplaceOpsSnapshot(readyInput);

    expect(snapshot.status).toBe('Ready for live ops');
    expect(snapshot.score).toBe(100);
    expect(snapshot.blockers).toEqual([]);
    expect(snapshot.sourceControlScore).toBe(100);
  });
});
