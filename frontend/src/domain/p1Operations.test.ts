import { describe, expect, it } from 'vitest';
import { buildP1OperationsSnapshot, type P1OperationsInput } from './p1Operations';

const previewInput: P1OperationsInput = {
  hasDateMarketplacePreview: true,
  hasLiveVenueProvider: false,
  hasReservationProvider: false,
  launchCityCount: 5,
  hasWaitlistModel: true,
  hasReferralRewards: true,
  hasAmbassadorModel: true,
  hasIndianEvents: true,
  hasAlumniGroups: true,
  hasSuccessStoriesModel: true,
  hasTrustOpsQueue: true,
  hasSupportSla: false,
  hasLegalDrafts: true,
  legalUrlsPublished: false,
};

describe('P1 operations readiness', () => {
  it('marks current preview ops as started when live providers are missing', () => {
    const snapshot = buildP1OperationsSnapshot(previewInput);

    expect(snapshot.status).toBe('P1 in progress');
    expect(snapshot.items.find((item) => item.id === 'live_date_marketplace')?.status).toBe('started');
    expect(snapshot.items.find((item) => item.id === 'admin_trust_ops')?.status).toBe('started');
    expect(snapshot.nextBestStep).toContain('SLA');
  });

  it('treats legal URLs and trust SLAs as store-critical P1 work', () => {
    const snapshot = buildP1OperationsSnapshot(previewInput);
    const storeCritical = snapshot.blockers.filter((item) => item.storeCritical).map((item) => item.id);

    expect(storeCritical).toEqual(['admin_trust_ops', 'legal_store_ops']);
  });

  it('passes P1 when providers, ops, and legal URLs are connected', () => {
    const snapshot = buildP1OperationsSnapshot({
      ...previewInput,
      hasLiveVenueProvider: true,
      hasReservationProvider: true,
      hasSupportSla: true,
      legalUrlsPublished: true,
    });

    expect(snapshot.status).toBe('P1 ready');
    expect(snapshot.score).toBe(100);
    expect(snapshot.blockers).toEqual([]);
  });
});
