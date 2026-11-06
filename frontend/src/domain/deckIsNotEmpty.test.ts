import { describe, expect, it } from 'vitest';

import { defaultMatchFilters } from '../storage';
import { rankMatches } from './matching';
import type { Match } from '../data';

/**
 * Home shows everyone. Preferences decide the order, not the guest list.
 *
 * There were two filter stacks doing the same job: one in the server's
 * discover query and one here. Relaxing the server alone changed nothing,
 * because this one ran afterwards on the same rows - and it is the harsher
 * of the two, testing intent, vibes, family priority, children, timeline
 * and relocation against members who have not filled those in. Everybody
 * was cut, and Home said "No profiles match these filters" about filters
 * the member had never set.
 */
const person = (over: Partial<Match> = {}): Match =>
  ({
    id: 'x',
    name: 'Someone',
    age: 28,
    city: 'Bareilly',
    profession: '',
    gender: 'woman',
    intent: '',
    match: 'Great Match',
    verified: false,
    vibes: [],
    photo: '',
    photos: [],
    about: '',
    hobbies: [],
    values: '',
    goals: '',
    timeline: '',
    children: '',
    family: '',
    relocation: '',
    languages: [],
    interests: [],
    familyPriority: 'balanced',
    vouches: { count: 0, qualities: [] },
    ...over,
  }) as Match;

const prefs = (filters: Partial<typeof defaultMatchFilters> = {}) => ({
  intent: '',
  vibes: [] as string[],
  filters: { ...defaultMatchFilters, ...filters },
});

describe('the deck', () => {
  it('keeps people who match nothing the member asked for', () => {
    const people = [
      person({ id: 'blank' }),
      person({ id: 'older', age: 58 }),
      person({ id: 'man', gender: 'man' }),
    ];
    const ranked = rankMatches(
      people,
      prefs({ lookingFor: 'Women', minAge: 21, maxAge: 45, intents: ['Marriage'] }),
      [],
      [],
    );
    expect(ranked.map((m) => m.id).sort()).toEqual(['blank', 'man', 'older']);
  });

  it('puts the people who do match first', () => {
    const people = [
      person({ id: 'off', age: 58, gender: 'man' }),
      person({ id: 'on', age: 27, gender: 'woman' }),
    ];
    const ranked = rankMatches(
      people,
      prefs({ lookingFor: 'Women', minAge: 21, maxAge: 45 }),
      [],
      [],
    );
    expect(ranked[0]?.id).toBe('on');
  });

  it('still removes blocked people, because that is not a preference', () => {
    const people = [person({ id: 'fine' }), person({ id: 'blocked' })];
    const ranked = rankMatches(people, prefs(), [], ['blocked']);
    expect(ranked.map((m) => m.id)).toEqual(['fine']);
  });

  it('orders by preference even when scoring is switched off', () => {
    const people = [
      person({ id: 'off', gender: 'man' }),
      person({ id: 'on', gender: 'woman' }),
    ];
    const ranked = rankMatches(people, prefs({ lookingFor: 'Women' }), [], [], false);
    expect(ranked.map((m) => m.id)).toEqual(['on', 'off']);
  });
});
