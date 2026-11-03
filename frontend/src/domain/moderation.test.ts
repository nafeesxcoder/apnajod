import { describe, expect, it } from 'vitest';
import { buildModerationQueue, classifyModerationCategory, scoreModerationCase, summarizeModerationQueue } from './moderation';

describe('moderation risk engine', () => {
  it('prioritizes money requests and off-app pressure', () => {
    const scored = scoreModerationCase({
      reason: 'Asked for money',
      details: 'They asked me to move to WhatsApp and buy a gift card.',
      previousReports: 2,
    });

    expect(scored.risk).toBe('Critical');
    expect(scored.riskScore).toBeGreaterThanOrEqual(90);
    expect(scored.evidence).toContain('Money/crypto/gift-card language');
    expect(scored.evidence).toContain('Pressure to move off-app');
  });

  it('classifies identity and unsafe meeting reports separately', () => {
    expect(classifyModerationCategory('Fake or misleading profile', 'photo does not match')).toBe('identity');
    expect(classifyModerationCategory('Safety concern', 'asked for my home address')).toBe('unsafe_meeting');
  });

  it('builds a queue from local reports plus seeded operational checks', () => {
    const queue = buildModerationQueue([
      {
        id: 'report-1',
        matchId: 'member-2',
        reason: 'Safety concern',
        details: 'They kept asking for exact location and home address.',
        createdAt: Date.now(),
      },
    ], 1);
    const summary = summarizeModerationQueue(queue);

    const localCase = queue.find((item) => item.id === 'report-1');
    expect(localCase?.category).toBe('unsafe_meeting');
    expect(localCase?.humanReviewRequired).toBe(true);
    expect(summary.total).toBeGreaterThanOrEqual(4);
    expect(summary.humanReview).toBeGreaterThanOrEqual(3);
    expect(summary.fastestSlaHours).toBeLessThanOrEqual(24);
  });
});
