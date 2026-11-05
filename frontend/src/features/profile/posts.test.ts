import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A profile shows what the member put there, and nothing else.
 *
 * It used to render three Unsplash pictures from a constant, on every
 * profile, behind a note saying to wire the real posts in later — so a brand
 * new account looked like it had already posted, and the pictures were of
 * strangers. A stock photo of a man sat behind every cover, including the
 * women's.
 */
const read = (path: string) => readFileSync(path, 'utf8');
const compact = (value: string) => value.replace(/\s+/g, '').replace(/"/g, "'");

function sourceFiles(dir: string, found: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, found);
    else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) found.push(path);
  }
  return found;
}

describe('a profile shows only what the member added', () => {
  it('shows no stock photo as if it belonged to a member', () => {
    // Two exceptions, both honest about what they are: data.ts is the
    // declared sample deck for the signed-out showcase, which the wiring
    // test already keeps away from signed-in members, and the welcome
    // screen's hero is marketing art on a page with no member on it.
    const allowed = new Set(['src/data.ts', 'src/features/access/screens/WelcomeScreen.tsx']);
    const offenders = sourceFiles('src')
      .filter((path) => !allowed.has(path.replace(/\\/g, '/')))
      .filter((path) => /unsplash\.com|picsum\.photos|placeholder\.com/i.test(read(path)));
    expect(offenders, `stock image URLs found in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('builds the cover from the member\'s own photo', () => {
    const profile = compact(read('src/features/profile/screens/ProfileScreen.tsx'));
    expect(profile).not.toContain('COVER_URI');
    expect(profile).toContain('profilePhoto?(');
  });

  it('loads posts from the server rather than a constant', () => {
    const profile = read('src/features/profile/screens/ProfileScreen.tsx');
    expect(profile).not.toContain('DEMO_POSTS');
    expect(profile).toContain('<PostsSection');
  });
});

describe('posts', () => {
  const section = read('src/features/profile/components/PostsSection.tsx');
  const addButton = read('src/features/profile/components/AddPostButton.tsx');

  it('can be added, re-captioned and deleted by their owner', () => {
    expect(compact(addButton)).toContain('postApi.create(');
    expect(compact(section)).toContain('postApi.updateCaption(');
    expect(compact(section)).toContain('postApi.remove(');
    expect(section).toContain('Edit caption');
    expect(section).toContain('Delete post');
  });

  it('uploads the photo before posting it', () => {
    // Posting the picker's own uri would store a path only that device can
    // resolve - the same break the selfie queue had.
    const uploadAt = addButton.indexOf('uploadPhoto(');
    const createAt = addButton.indexOf('postApi.create(');
    expect(uploadAt).toBeGreaterThan(-1);
    expect(createAt).toBeGreaterThan(uploadAt);
  });

  it('is added from one place, not copied onto each screen', () => {
    // The picker, the upload and the caption box live in AddPostButton, so
    // the + on the cover and the + on Home cannot drift apart.
    for (const path of [
      'src/features/profile/screens/ProfileScreen.tsx',
      'src/features/discovery/screens/HomeScreen.tsx',
    ]) {
      expect(read(path), `${path} should use AddPostButton`).toContain('<AddPostButton');
      expect(read(path), `${path} should not run its own picker`).not.toContain(
        'launchImageLibraryAsync',
      );
    }
  });

  it('says so plainly when there are none', () => {
    expect(section).toContain('Nothing posted yet');
    expect(section).toContain('They have not posted anything yet');
  });
});
