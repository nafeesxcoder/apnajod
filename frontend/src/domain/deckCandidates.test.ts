import { describe, expect, it } from 'vitest';

import { deckCandidates, rankMatches } from './matching';
import { defaultMatchFilters } from '../storage';
import type { Match } from '../data';

/**
 * Sample people must never reach a signed-in member's deck.
 *
 * They were the fallback while the server's deck was in flight, and the
 * client-side filters happened to cut them. When the deck stopped cutting
 * rows - so that every real account shows, private ones included - that
 * accident went with it, and a member saw invented people. Liking one sent
 * its id to the server, which has a foreign key onto users: 500, and the
 * screen the member saw was the crash boundary.
 */
const person = (id: string, over: Partial<Match> = {}): Match =>
  ({
    id,
    name: id,
    age: 27,
    city: 'Delhi',
    state: 'Delhi',
    profession: 'Engineer',
    intent: 'Marriage',
    vibes: ['Family First'],
    match: 'Strong Match',
    photos: [],
    bio: '',
    ...over,
  }) as Match;

const samples = [person('sample-1'), person('sample-2')];

describe('deckCandidates', () => {
  it('shows nobody rather than samples while a member waits on the server', () => {
    expect(
      deckCandidates({ serverDiscovered: null, samples, signedIn: true }),
    ).toEqual([]);
  });

  it('still shows nobody when the server came back empty', () => {
    // An empty deck is a real answer - nobody left to show - not a reason to
    // fall back. `[]` is not null, so this is the server's own result.
    expect(
      deckCandidates({ serverDiscovered: [], samples, signedIn: true }),
    ).toEqual([]);
  });

  it('serves the server deck once it arrives', () => {
    const real = [person('real-1')];
    expect(
      deckCandidates({ serverDiscovered: real, samples, signedIn: true }),
    ).toEqual(real);
  });

  it('keeps the samples for the signed-out showcase', () => {
    // The showcase has to show something, and nobody can like from it.
    expect(
      deckCandidates({ serverDiscovered: null, samples, signedIn: false }),
    ).toEqual(samples);
  });

  it('leaves no sample in a signed-in deck even after ranking', () => {
    // rankMatches no longer cuts anyone, so this is the only gate there is.
    const ranked = rankMatches(
      deckCandidates({ serverDiscovered: null, samples, signedIn: true }),
      { intent: 'Marriage', vibes: [], filters: defaultMatchFilters },
      [],
      [],
      true,
    );
    expect(ranked).toEqual([]);
  });
});
