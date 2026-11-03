import { describe, expect, it } from 'vitest';

import { matchFromSocialUser } from './socialMatch';
import { conversationIdFor, profileIdFor } from './matchIdentity';
import type { SocialUser } from '../api/socialApi';

const person: SocialUser = {
  userId: 'user-42',
  username: 'riya_07',
  name: 'Riya',
  avatarUrl: 'https://example.com/riya.jpg',
  isPrivate: false,
};

describe('matchFromSocialUser', () => {
  it('addresses the thread by the other person id', () => {
    const match = matchFromSocialUser(person);
    // Every chat route takes the other person's id as the conversation id.
    expect(conversationIdFor(match)).toBe('user-42');
    expect(profileIdFor(match)).toBe('user-42');
  });

  it('falls back to the username when there is no display name', () => {
    expect(matchFromSocialUser({ ...person, name: '' }).name).toBe('riya_07');
  });

  it('carries the avatar through as the single photo', () => {
    const match = matchFromSocialUser(person);
    expect(match.photo).toBe('https://example.com/riya.jpg');
    expect(match.photos).toEqual(['https://example.com/riya.jpg']);
  });

  it('leaves photos empty rather than inventing one', () => {
    const match = matchFromSocialUser({ ...person, avatarUrl: null });
    expect(match.photo).toBe('');
    expect(match.photos).toEqual([]);
  });

  it('does not invent profile details the follow graph does not have', () => {
    const match = matchFromSocialUser(person);
    expect(match.age).toBe(0);
    expect(match.city).toBe('');
    expect(match.intent).toBe('');
    expect(match.vibes).toEqual([]);
    expect(match.vouches).toEqual({ count: 0, qualities: [] });
  });
});
