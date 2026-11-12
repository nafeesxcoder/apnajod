import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { referralLine } from './referralLine';

const read = (path: string) => readFileSync(resolve(__dirname, '../../..', path), 'utf8');

describe('invite & earn', () => {
  it('sends the invite with the new account, then forgets it', () => {
    const app = read('src/app/MilaanApp.tsx');
    expect(app).toMatch(/registerVerify\(\{[\s\S]*?invite: storedInvite\(\) \|\| undefined,[\s\S]*?\}\);\s*clearInvite\(\);/);
  });

  it('tells the inviter what they get, and how many friends have joined', () => {
    const profile = read('src/features/profile/screens/ProfileScreen.tsx');
    expect(profile).toContain('Get a free Boost when a friend joins and adds a photo.');
    expect(profile).toContain('referralLine(referrals)');
  });

  it('counts friends and Boosts in plain words', () => {
    expect(referralLine(null)).toBe('');
    expect(referralLine({ joined: 0, boostsEarned: 0, pending: 0, monthlyCap: 10 })).toBe('');
    expect(referralLine({ joined: 1, boostsEarned: 1, pending: 0, monthlyCap: 10 })).toBe('1 friend joined · 1 Boost earned');
    expect(referralLine({ joined: 3, boostsEarned: 2, pending: 1, monthlyCap: 10 })).toBe('3 friends joined · 2 Boosts earned');
  });
});
