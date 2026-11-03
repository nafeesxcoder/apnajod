import { describe, expect, it } from 'vitest';
import { conversationIdFor, hasProductionMatchIdentity, profileIdFor } from './matchIdentity';

describe('match identity boundary', () => {
  it('keeps production profile and relationship identifiers distinct', () => {
    const match = { id: 'local-1', profileId: 'profile-uuid', matchId: 'match-uuid' };
    expect(profileIdFor(match)).toBe('profile-uuid');
    expect(conversationIdFor(match)).toBe('match-uuid');
    expect(hasProductionMatchIdentity(match)).toBe(true);
  });

  it('preserves mock-mode records without changing local state keys', () => {
    const match = { id: '1' };
    expect(profileIdFor(match)).toBe('1');
    expect(conversationIdFor(match)).toBe('1');
    expect(hasProductionMatchIdentity(match)).toBe(false);
  });
});
