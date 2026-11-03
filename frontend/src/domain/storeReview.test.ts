import { describe, expect, it } from 'vitest';
import { buildStoreReviewSnapshot } from './storeReview';

describe('store review readiness', () => {
  it('tracks configured reviewer access without embedding credentials', () => {
    const snapshot = buildStoreReviewSnapshot({
      appEnvironment: 'preview',
      backendMode: 'demo',
      demoOtpFallbackAllowed: true,
      reviewerAccessConfigured: true,
      reviewerAccessReference: 'Play Console reviewer notes v1',
      supportContactConfigured: true,
      legalUrlsPublished: true,
    });

    expect(snapshot.ready).toBe(true);
    expect(snapshot.score).toBe(100);
    expect(snapshot.reviewerInstructions.join(' ')).toContain('Play Console reviewer notes v1');
    expect(snapshot.reviewerInstructions.join(' ')).not.toMatch(/@|123456/);
  });

  it('blocks production when demo OTP fallback is still enabled', () => {
    const snapshot = buildStoreReviewSnapshot({
      appEnvironment: 'production',
      backendMode: 'aws',
      demoOtpFallbackAllowed: true,
      reviewerAccessConfigured: true,
      reviewerAccessReference: 'App Store Connect reviewer notes v1',
      supportContactConfigured: true,
      legalUrlsPublished: true,
    });

    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers.map((item) => item.id)).toContain('production_demo_guard');
  });

  it('blocks production when backend is not real', () => {
    const snapshot = buildStoreReviewSnapshot({
      appEnvironment: 'production',
      backendMode: 'demo',
      demoOtpFallbackAllowed: false,
      reviewerAccessConfigured: true,
      reviewerAccessReference: 'Protected reviewer notes v1',
      supportContactConfigured: true,
      legalUrlsPublished: true,
    });

    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers.map((item) => item.id)).toContain('production_backend');
  });

  it('does not claim reviewer readiness from a client-side placeholder', () => {
    const snapshot = buildStoreReviewSnapshot({
      appEnvironment: 'preview',
      backendMode: 'demo',
      demoOtpFallbackAllowed: true,
      reviewerAccessConfigured: false,
      supportContactConfigured: false,
      legalUrlsPublished: false,
    });
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers.map((item) => item.id)).toContain('reviewer_credentials');
    expect(snapshot.reviewerInstructions.join(' ')).not.toMatch(/reviewer@|OTP\/code:/);
  });
});
