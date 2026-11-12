import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, '../../..', path), 'utf8');

describe('show my family', () => {
  it('offers someone else\'s profile only once you are a match', () => {
    const person = read('src/features/social/screens/PersonScreen.tsx');
    expect(person).toMatch(/likeStatus === "accepted" && \(\s*<FamilyShareButton/);
  });

  it('keeps one Share button on your own profile, which asks family or friends', () => {
    const profile = read('src/features/profile/screens/ProfileScreen.tsx');
    expect(profile).toContain('title: "Send to family"');
    expect(profile).toContain('title: "Invite friends · earn Boosts"');
    expect(profile).not.toContain('<FamilyShareButton');
  });

  it('shows intent badges in their own section under About, not in the profile header', () => {
    for (const file of [
      'src/features/profile/screens/ProfileScreen.tsx',
      'src/features/social/screens/PersonScreen.tsx',
      'src/features/discovery/screens/MatchDetailScreen.tsx',
    ]) {
      const source = read(file);
      expect(source).toContain('<IntentSection');
      expect(source).not.toContain('<IntentBadges center');
    }
  });

  it('opens the shared profile on its own, with no sign-in, only for a well-formed token', () => {
    const app = read('src/app/MilaanApp.tsx');
    expect(app).toContain('/^[a-f0-9]{32}$/.test(token)');
    expect(app).toContain('<SharedProfilePage token={sharedProfileToken} />');
  });

  it('tells family when the link stops working and not to forward it', () => {
    const page = read('src/features/share/SharedProfilePage.tsx');
    expect(page).toContain('This private link stops working on');
    expect(page).toContain('do not');
  });
});
