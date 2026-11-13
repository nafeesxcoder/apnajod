import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { profileStrength } from './profileStrength';

const complete = {
  firstName: 'Riya',
  age: '26',
  gender: 'Woman',
  city: 'Pune',
  profession: 'Designer',
  bio: 'I love long walks, filter coffee and old Hindi songs.',
  hobbies: ['Travel', 'Music', 'Cooking'],
  photoCount: 4,
  alignment: { timeline: 'Within 1-2 years', children: 'Open', family: 'Close', relocation: 'Open' },
  verificationStatus: 'approved' as const,
};

describe('profile strength', () => {
  it('weights add up to exactly 100', () => {
    const { score, steps } = profileStrength(complete);
    expect(steps.reduce((sum, s) => sum + s.points, 0)).toBe(100);
    expect(score).toBe(100);
  });

  it('an empty profile is 0 and the first thing to do is a photo', () => {
    const { score, next } = profileStrength({ photoCount: 0 });
    expect(score).toBe(0);
    expect(next?.key).toBe('photo');
    expect(next?.screen).toBe('profileSetup');
  });

  it('a one-word bio or two hobbies are not enough', () => {
    const { steps } = profileStrength({ ...complete, bio: 'Hi', hobbies: ['A', 'B'] });
    const done = Object.fromEntries(steps.map((s) => [s.key, s.done]));
    expect(done.bio).toBe(false);
    expect(done.hobbies).toBe(false);
  });

  it('one photo is all a profile can have, so one photo is full marks', () => {
    const { score, steps } = profileStrength({ ...complete, photoCount: 1 });
    expect(score).toBe(100);
    expect(steps.some((s) => /more photos/i.test(s.label))).toBe(false);
  });

  it('a selfie under review is not nagged about, and is not counted yet', () => {
    const { score, steps, next } = profileStrength({ ...complete, verificationStatus: 'pending' });
    expect(score).toBe(85);
    expect(steps.find((s) => s.key === 'verify')?.waiting).toBe(true);
    expect(next).toBeNull();
  });

  it('verification goes to the selfie screen, the future questions to alignment', () => {
    expect(profileStrength({ ...complete, verificationStatus: 'none' }).next?.screen).toBe('verifyHub');
    expect(profileStrength({ ...complete, alignment: {} }).next?.screen).toBe('alignment');
  });

  it('shows on Home only, with your real photo count and verification', () => {
    expect(read('src/features/discovery/screens/HomeScreen.tsx')).toContain('<ProfileStrengthCard');
    expect(read('src/features/profile/screens/ProfileScreen.tsx')).not.toContain('ProfileStrengthCard');
    const app = read('src/app/MilaanApp.tsx');
    expect(app).toContain('strength={profileStrength({');
    expect(app).toContain('photoCount: profilePhotos.filter(Boolean).length,');
  });
});

function read(path: string) {
  return readFileSync(resolve(__dirname, '../..', path), 'utf8');
}
