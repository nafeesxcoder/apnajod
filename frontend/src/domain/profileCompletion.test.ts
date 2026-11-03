import { describe, expect, it } from 'vitest';
import { initialProfileDraft } from '../storage';
import { buildProfileCompletion, profileCompletionReminderIntervalMs } from './profileCompletion';

const completeProfile = {
  ...initialProfileDraft,
  firstName: 'Aarav',
  age: '30',
  city: 'Fresno, CA',
  profession: 'Engineer',
};

describe('profile completion reminders', () => {
  it('scores only completed, member-owned profile signals', () => {
    const result = buildProfileCompletion({
      profile: completeProfile,
      verified: true,
      photoCount: 3,
      hasVoiceIntro: true,
      vouchCount: 1,
      vibeCount: 3,
      intent: 'Marriage',
      lastReminderShownAt: 0,
      now: 100,
    });
    expect(result.score).toBe(100);
    expect(result.complete).toBe(true);
    expect(result.reminderDue).toBe(false);
  });

  it('selects one useful next action and enforces a daily reminder cadence', () => {
    const now = 200_000_000;
    const result = buildProfileCompletion({
      profile: { ...completeProfile, profession: '' },
      verified: true,
      photoCount: 1,
      hasVoiceIntro: false,
      vouchCount: 0,
      vibeCount: 2,
      intent: 'Marriage',
      lastReminderShownAt: now - profileCompletionReminderIntervalMs + 1,
      now,
    });
    expect(result.score).toBe(10);
    expect(result.nextTask?.id).toBe('identity');
    expect(result.reminderDue).toBe(false);
  });
});
