import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Liking somebody you found by searching must reach them.
 *
 * The search results, the person page and the people lists all used to call
 * socialApi.follow. That wrote a follow row, which the Likes tab never reads
 * (it reads match decisions) and which messaging - gated on a mutual like -
 * never unlocks. So the like went nowhere: nothing to accept, no chat, on a
 * dating app where that is the only way a conversation starts.
 */
const read = (path: string) => readFileSync(path, 'utf8');
const compact = (value: string) => value.replace(/\s+/g, '').replace(/"/g, "'");

describe('liking from search', () => {
  const app = read('src/app/MilaanApp.tsx');

  it('records a match decision, not a follow', () => {
    expect(compact(app)).toContain("matchApi.decide(accessToken,userId,'interested')");
  });

  it('wires every onFollow to that one handler', () => {
    // Two screens offer the button now: search results and a person's page.
    // The followers/following lists went with the follow system. Any one
    // left on socialApi.follow is a like that silently disappears.
    const handlers = app.match(/onFollow=\{[^}]*\}/g) ?? [];
    expect(handlers.length).toBeGreaterThanOrEqual(2);
    for (const handler of handlers) {
      expect(handler, `still follows: ${handler}`).not.toContain('socialApi.follow');
      expect(handler).toContain('likeFromSearch');
    }
  });

  it('says Like on the button, not Follow', () => {
    for (const path of [
      'src/features/social/screens/FindPeopleScreen.tsx',
      'src/features/social/screens/PersonScreen.tsx',
    ]) {
      const source = read(path);
      expect(source, `${path} offers a Like`).toMatch(/'Like'|"Like"/);
      expect(source, `${path} should not label it Follow`).not.toContain('"Follow"');
    }
  });

  it('has no follow system left to drift back to', () => {
    const api = read('src/api/socialApi.ts');
    for (const gone of ['async follow(', 'async unfollow(', 'async requests(', 'async respond(']) {
      expect(api, `socialApi still has ${gone}`).not.toContain(gone);
    }
    // The two screens that existed only to work the follow graph.
    for (const path of [
      'src/features/social/screens/RequestsScreen.tsx',
      'src/features/social/screens/PeopleListScreen.tsx',
    ]) {
      expect(() => read(path), `${path} is back`).toThrow();
    }
  });
});
