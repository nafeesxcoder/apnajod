import type { Match } from '../data';
import type { SocialUser } from '../api/socialApi';

/**
 * Adapt a person from the follow graph into the shape the chat screen takes.
 *
 * Chat was written for the old matching product, so it is typed around
 * `Match`. The thread itself only needs an identity and a name: every chat
 * route addresses a conversation by the other person's id, and
 * `conversationIdFor` reads `matchId` first, so that is the field that has to
 * carry it. The rest of `Match` described a curated introduction and has no
 * meaning here, so it is left empty rather than invented.
 */
export function matchFromSocialUser(user: SocialUser): Match {
  return {
    id: user.userId,
    profileId: user.userId,
    matchId: user.userId,
    name: user.name || user.username,
    age: 0,
    city: '',
    profession: '',
    gender: 'nonbinary',
    intent: '',
    match: 'Great Match',
    verified: false,
    vibes: [],
    photo: user.avatarUrl || '',
    photos: user.avatarUrl ? [user.avatarUrl] : [],
    about: '',
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
  };
}
