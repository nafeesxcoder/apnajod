import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, '../../..', path), 'utf8');

describe('show my family', () => {
  it('offers someone else\'s profile only once you are a match', () => {
    const person = read('src/features/social/screens/PersonScreen.tsx');
    expect(person).toMatch(/likeStatus === "accepted" && \(\s*<FamilyShareButton/);
  });

  it('lets members send their own profile from their profile page', () => {
    expect(read('src/features/profile/screens/ProfileScreen.tsx')).toContain('label="Send my profile to family"');
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
