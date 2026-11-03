import { describe, expect, it } from 'vitest';
import { matches } from '../data';
import { buildHomeGrowthLoop, buildRetentionPlan, evaluateDeckHealth, evaluateProfileQuality } from './growth';

describe('growth loop', () => {
  it('prioritizes trust-building nudges when profile is incomplete', () => {
    const quality = evaluateProfileQuality({
      hasPhoto: false,
      verified: false,
      hasVoiceIntro: false,
      vouchesCount: 0,
      vibeCount: 2,
      hasIntent: true,
    });

    expect(quality.stage).toBe('Starter');
    expect(quality.missing).toContain('Add a clear profile photo');
    expect(quality.missing).toContain('Complete selfie verification');
  });

  it('uses labels, not public scores, for deck health', () => {
    const health = evaluateDeckHealth(matches.slice(0, 4), []);
    expect(health.label).toBe('Fresh start');
    expect(health.publicScoreShown).toBe(false);
    expect(health.body.toLowerCase()).not.toContain('score');
  });

  it('suggests wider filters when no visible profiles exist', () => {
    const loop = buildHomeGrowthLoop({
      visibleMatches: [],
      preferences: { intent: 'Marriage', vibes: ['Family First'] },
      signals: [],
      dismissedCount: 0,
      profile: {
        hasPhoto: true,
        verified: true,
        hasVoiceIntro: true,
        vouchesCount: 2,
        vibeCount: 5,
        hasIntent: true,
      },
    });

    expect(loop.deckHealth.label).toBe('Needs wider filters');
    expect(loop.nudges[0]?.id).toBe('widen_filters');
    expect(loop.notificationIdeas[0]?.title).toBe('Filters may be too tight');
  });

  it('turns app activity into a learning-fast label', () => {
    const loop = buildHomeGrowthLoop({
      visibleMatches: matches.slice(0, 8),
      preferences: { intent: 'Long-term, leading to Marriage', vibes: ['Ambitious'] },
      signals: [
        { type: 'view', matchId: '1', createdAt: 1 },
        { type: 'view', matchId: '2', createdAt: 2 },
        { type: 'view', matchId: '3', createdAt: 3 },
      ],
      dismissedCount: 0,
      profile: {
        hasPhoto: true,
        verified: true,
        hasVoiceIntro: false,
        vouchesCount: 1,
        vibeCount: 5,
        hasIntent: true,
      },
    });

    expect(loop.deckHealth.label).toBe('Learning fast');
    expect(loop.nudges.some((nudge) => nudge.id === 'voice')).toBe(true);
  });

  it('builds all daily retention loops without showing public scores', () => {
    const plan = buildRetentionPlan({
      visibleMatches: matches.slice(0, 8),
      signals: [
        { type: 'view', matchId: '1', createdAt: 1 },
        { type: 'interested', matchId: '2', createdAt: 2 },
        { type: 'skip', matchId: '3', createdAt: 3 },
      ],
      dismissedCount: 1,
      profile: {
        hasPhoto: true,
        verified: true,
        hasVoiceIntro: true,
        vouchesCount: 2,
        vibeCount: 5,
        hasIntent: true,
      },
    });

    expect(plan.dailyMatches).toBe(5);
    expect(plan.profileViewNotification.title.toLowerCase()).toContain('viewed');
    expect(plan.loops.map((loop) => loop.id)).toEqual(expect.arrayContaining([
      'daily_matches',
      'daily_prompt',
      'weekly_drop',
      'voice_unlock',
      'date_reminder',
      'quality_feedback',
      'coach_suggestion',
      'profile_view',
      'events_near_you',
      'trusted_rewards',
    ]));
    expect(plan.loops.some((loop) => loop.body.toLowerCase().includes('score'))).toBe(false);
  });

  it('routes voice intro unlock to profile setup until a voice intro exists', () => {
    const plan = buildRetentionPlan({
      visibleMatches: matches.slice(0, 3),
      signals: [],
      dismissedCount: 0,
      profile: {
        hasPhoto: true,
        verified: true,
        hasVoiceIntro: false,
        vouchesCount: 0,
        vibeCount: 5,
        hasIntent: true,
      },
    });
    const voiceLoop = plan.loops.find((loop) => loop.id === 'voice_unlock');

    expect(voiceLoop?.active).toBe(false);
    expect(voiceLoop?.actionScreen).toBe('profileSetup');
    expect(voiceLoop?.actionLabel).toBe('Record');
  });
});
