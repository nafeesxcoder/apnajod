import { describe, expect, it } from 'vitest';
import { parseServerDailyMatch, type ServerDailyMatchRow } from './serverMatching';

const row: ServerDailyMatchRow = {
  profile_id: '00000000-0000-4000-8000-000000000002',
  match_id: '10000000-0000-4000-8000-000000000001',
  first_name: 'Asha',
  age: 29,
  city: 'Toronto, ON',
  profession: 'Product Manager',
  bio: 'Family-minded and ready for something lasting.',
  verified: true,
  gender: 'woman',
  intent: 'long_term_to_marriage',
  vibes: ['Family First', 'Ambitious'],
  family_priority: 'high',
  children_intent: 'wants',
  marriage_timeline: '1_2_years',
  relocation: 'open',
  languages: ['English', 'Hindi'],
  vouch_count: 2,
  photo_paths: ['member/photo/one.jpg'],
  match_label: 'Exceptional',
  reasons: ['Same relationship intent', 'Family expectations align'],
  model_version: 'intentional-v2',
};

describe('server daily match parser', () => {
  it('keeps profile and relationship identities separate and exposes explanations', () => {
    const match = parseServerDailyMatch(row, ['https://media.example/one.jpg']);
    expect(match).toMatchObject({
      id: row.profile_id,
      profileId: row.profile_id,
      matchId: row.match_id,
      match: 'Exceptional Match',
      reasons: row.reasons,
      modelVersion: 'intentional-v2',
    });
  });

  it('fails closed when identity, age, gender, or approved media is unusable', () => {
    expect(parseServerDailyMatch({ ...row, profile_id: 'preview-id' }, ['https://media.example/one.jpg'])).toBeNull();
    expect(parseServerDailyMatch({ ...row, age: 17 }, ['https://media.example/one.jpg'])).toBeNull();
    expect(parseServerDailyMatch({ ...row, gender: 'unknown' }, ['https://media.example/one.jpg'])).toBeNull();
    expect(parseServerDailyMatch(row, [])).toBeNull();
  });
});
