import { describe, expect, it } from 'vitest';
import { buildPlacesReservationReadinessSnapshot, type PlacesReservationReadinessInput } from './placesReservationReadiness';

const readyInput: PlacesReservationReadinessInput = {
  appEnvironment: 'production',
  venueCount: 48,
  cityCount: 22,
  categoryCount: 8,
  packageCount: 6,
  partnerLeadCount: 30,
  signedPartnerCount: 5,
  hasSearch: true,
  hasSafeFirstDateFilter: true,
  hasLocationConsent: true,
  hasSafetyCheckIns: true,
  livePlacesProviderConnected: true,
  hasHoursRatingsMaps: true,
  reservationProviderConnected: true,
  reservationHoldFlowReady: true,
  availabilitySyncReady: true,
  paymentWebhookConnected: true,
  refundPolicyReady: true,
  supportSlaHours: 12,
  safetyStaffingReady: true,
  deepLinkRoutesReady: true,
  physicalDeviceQaReady: true,
  productionLocked: true,
};

describe('places and reservation readiness', () => {
  it('keeps curated preview honest when live venue providers are pending', () => {
    const snapshot = buildPlacesReservationReadinessSnapshot({
      ...readyInput,
      appEnvironment: 'preview',
      livePlacesProviderConnected: false,
      hasHoursRatingsMaps: false,
      reservationProviderConnected: false,
      availabilitySyncReady: false,
      paymentWebhookConnected: false,
      refundPolicyReady: false,
      deepLinkRoutesReady: false,
      physicalDeviceQaReady: false,
      productionLocked: false,
    });

    expect(snapshot.status).toBe('Final venue providers pending');
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'places_provider',
      'reservation_provider',
      'payments_refunds',
      'production_qa',
    ]));
  });

  it('blocks launch when inventory, packages or safety controls are not ready', () => {
    const snapshot = buildPlacesReservationReadinessSnapshot({
      ...readyInput,
      venueCount: 10,
      cityCount: 3,
      categoryCount: 4,
      packageCount: 2,
      partnerLeadCount: 4,
      signedPartnerCount: 0,
      hasLocationConsent: false,
      hasSafetyCheckIns: false,
      safetyStaffingReady: false,
      supportSlaHours: 72,
    });

    expect(snapshot.status).toBe('Places setup needed');
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'curated_inventory',
      'packages_partners',
      'safety_location',
      'support_operations',
    ]));
  });

  it('passes when live places, reservations, payments, safety and QA are ready', () => {
    const snapshot = buildPlacesReservationReadinessSnapshot(readyInput);

    expect(snapshot.status).toBe('Ready for live reservations');
    expect(snapshot.score).toBe(100);
    expect(snapshot.partnerCoverage).toBe(100);
    expect(snapshot.blockerCount).toBe(0);
  });
});
