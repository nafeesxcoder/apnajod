import { describe, expect, it } from 'vitest';
import { matches } from '../data';
import { buildCityLaunchPlans, buildNetworkEffectPlan } from './networkEffects';

describe('network effects', () => {
  it('creates the required city-by-city launch strategy', () => {
    const plans = buildCityLaunchPlans(matches);

    expect(plans.map((plan) => plan.name)).toEqual(['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Pune']);
    expect(plans.every((plan) => plan.productionVerifiedGoal >= 180)).toBe(true);
    expect(plans.every((plan) => plan.waitlistGoal > plan.productionVerifiedGoal)).toBe(true);
  });

  it('prioritizes the selected launch city when the user filters by city', () => {
    const plan = buildNetworkEffectPlan({
      matches,
      selectedCities: ['Mumbai'],
      verified: true,
      vouchesCount: 2,
    });

    expect(plan.priorityCity.name).toBe('Mumbai');
    expect(plan.loops.map((loop) => loop.id)).toEqual(expect.arrayContaining([
      'city_launch',
      'waitlist_invite',
      'referral_rewards',
      'friend_vouch',
      'community_ambassadors',
      'indian_professional_events',
      'alumni_groups',
      'success_stories',
      'bring_3_verified_friends',
    ]));
  });

  it('tracks the bring 3 verified friends challenge', () => {
    const plan = buildNetworkEffectPlan({
      matches,
      selectedCities: [],
      verified: false,
      vouchesCount: 1,
      invitedVerifiedFriends: 1,
    });
    const challengeLoop = plan.loops.find((loop) => loop.id === 'bring_3_verified_friends');

    expect(plan.inviteChallenge.current).toBe(1);
    expect(plan.inviteChallenge.remaining).toBe(2);
    expect(plan.inviteChallenge.complete).toBe(false);
    expect(challengeLoop?.body).toContain('2 more verified friends');
  });

  it('marks the verified-friend challenge complete at three invites', () => {
    const plan = buildNetworkEffectPlan({
      matches,
      selectedCities: ['New York, NY'],
      verified: true,
      vouchesCount: 3,
      invitedVerifiedFriends: 3,
    });

    expect(plan.inviteChallenge.complete).toBe(true);
    expect(plan.loops.find((loop) => loop.id === 'success_stories')?.active).toBe(true);
  });
});
