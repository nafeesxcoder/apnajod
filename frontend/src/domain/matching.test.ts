import { describe, expect, it } from 'vitest';
import { matches } from '../data';
import type { DiscoverySignal } from '../storage';
import { matchReasons, passesFilters, publicMatchLabel, rankMatches, scoreMatch } from './matching';

const signal = (type: DiscoverySignal['type'], matchId: string): DiscoverySignal => ({
  id: `${type}-${matchId}`,
  type,
  matchId,
  createdAt: 1,
});

describe('privacy-safe matching', () => {
  it('prioritizes stated vibes and intent', () => {
    const ranked = rankMatches(matches, {
      intent: 'Long-term, leading to Marriage',
      vibes: ['Family First', 'Foodie'],
    }, [], []);
    expect(ranked[0]?.name).toBe('Anika');
  });

  it('learns from in-app signals without external activity', () => {
    const score = scoreMatch(matches[2]!, { intent: '', vibes: [] }, [
      signal('interested', matches[2]!.id),
      signal('view', matches[2]!.id),
    ]);
    expect(score).toBe(6.5);
  });

  it('removes blocked profiles before ranking', () => {
    const ranked = rankMatches(matches, { intent: '', vibes: [] }, [], [matches[0]!.id]);
    expect(ranked.some((match) => match.id === matches[0]!.id)).toBe(false);
  });

  it('exposes labels, never percentage scores', () => {
    expect(publicMatchLabel(94)).toBe('Exceptional Match');
    expect(publicMatchLabel(72)).toBe('Great Match');
    expect(publicMatchLabel(40)).toBe('Strong Match');
  });

  it('boosts family-first profiles when family is a priority', () => {
    const ranked = rankMatches(matches, {
      intent: 'Marriage',
      vibes: ['Family First'],
      filters: {
        lookingFor: 'Women',
        minAge: 25,
        maxAge: 35,
        cities: [],
        intents: [],
        mustHaveVibes: [],
        familyPriority: 'high',
        children: 'wants',
        marriageTimeline: '1_2_years',
        relocation: 'any',
        distancePreference: 'anywhere',
      },
    }, [], []);
    expect(ranked[0]?.familyPriority).toBe('high');
    expect(matchReasons(ranked[0]!, { intent: 'Marriage', vibes: ['Family First'], filters: {
      lookingFor: 'Women',
      minAge: 25,
      maxAge: 35,
      cities: [],
      intents: [],
      mustHaveVibes: [],
      familyPriority: 'high',
      children: 'wants',
      marriageTimeline: '1_2_years',
      relocation: 'any',
      distancePreference: 'anywhere',
    }})).toContain('Family-first match');
  });

  it('applies detailed filters before ranking', () => {
    expect(passesFilters(matches[0]!, {
      lookingFor: 'Women',
      minAge: 30,
      maxAge: 35,
      cities: [],
      intents: [],
      mustHaveVibes: [],
      familyPriority: 'any',
      children: 'any',
      marriageTimeline: 'any',
      relocation: 'any',
      distancePreference: 'anywhere',
    })).toBe(false);
  });
});
