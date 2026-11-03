import { describe, expect, it } from 'vitest';
import { buildDateMarketplaceSnapshot, type DateMarketplaceInput } from './dateMarketplace';

const readyInput: DateMarketplaceInput = {
  venueCount: 44,
  cityCount: 22,
  packageCount: 6,
  eventCount: 8,
  hasSearch: true,
  hasSafeFirstDateFilter: true,
  hasPartnerProgram: true,
  hasReservationApiPlan: true,
  hasSafetyCheckIns: true,
  hasIndianMixers: true,
  hasSpeedVideoEvents: true,
  hasPremiumDinners: true,
};

describe('date marketplace readiness', () => {
  it('marks the marketplace ready when venues, packages, events, safety and partner paths exist', () => {
    const snapshot = buildDateMarketplaceSnapshot(readyInput);

    expect(snapshot.ready).toBe(true);
    expect(snapshot.score).toBe(100);
    expect(snapshot.blockers).toEqual([]);
  });

  it('requires a real searchable venue database before claiming marketplace depth', () => {
    const snapshot = buildDateMarketplaceSnapshot({
      ...readyInput,
      venueCount: 12,
      cityCount: 6,
      hasSearch: false,
    });

    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers.map((pillar) => pillar.id)).toContain('real_venue_database');
  });

  it('keeps date safety separate from venue search', () => {
    const snapshot = buildDateMarketplaceSnapshot({
      ...readyInput,
      hasSafeFirstDateFilter: false,
      hasSafetyCheckIns: false,
    });

    expect(snapshot.blockers.map((pillar) => pillar.id)).toEqual(['date_safety']);
  });

  it('requires Indian mixers, video speed dates and premium dinners for the event layer', () => {
    const snapshot = buildDateMarketplaceSnapshot({
      ...readyInput,
      hasIndianMixers: false,
      hasPremiumDinners: false,
    });

    expect(snapshot.blockers.map((pillar) => pillar.id)).toEqual(['community_events']);
  });
});
