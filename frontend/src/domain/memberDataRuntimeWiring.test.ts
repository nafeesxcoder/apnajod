import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The app ships with sample people so the signed-out showcase has something
 * to show. They must never reach a signed-in member: being shown invented
 * people is what made a working app feel fake, and nobody can see the
 * failure, because the screen looks fine either way.
 *
 * These read the source rather than render it, because what is being checked
 * is the wiring — which branch supplies the data.
 */
const shell = readFileSync('src/app/MilaanApp.tsx', 'utf8');

// Formatting-insensitive, so a Prettier pass does not break these checks.
const compact = (value: string) =>
  value.replace(/\s+/g, '').replace(/"/g, "'").replace(/,([)}\]])/g, '$1');
const wired = (value: string) => expect(compact(shell)).toContain(compact(value));

describe('member data runtime wiring', () => {
  it('never seeds the selected person from the sample deck', () => {
    // `useState<Match>(matches[0]!)` put an invented person in a signed-in
    // member's chat before they had opened anyone. The seed is an empty
    // person instead, and every screen that renders a partner is gated on a
    // real one having been chosen.
    expect(shell).not.toContain('useState<Match>(matches[0]!)');
    wired('const [selected, setSelected] = useState<Match>(noPartner)');
    wired('const hasSelected = !!selected.id');
    for (const route of ['detail', 'mutual', 'icebreaker']) {
      wired(`screen === "${route}" && hasSelected &&`);
    }
  });

  it('opens a thread from the follow graph without inventing a match', () => {
    wired('const openConversationWith = (user: SocialUser)');
    wired('setSelected(matchFromSocialUser(user))');
  });

  it('serves the deck from the server for a signed-in member', () => {
    // The deck is the dating product again, so it has to exist — but it is
    // ranked from what the server returned, never from the samples.
    wired('profileApi.discoverMatches(');
    wired('rankMatches(');
  });

  it('never falls back to the sample deck for a signed-in member', () => {
    // `serverDiscoveredMatches ?? matches` was the fallback, and the client
    // filters cut the samples out by accident. Once the deck stopped cutting
    // rows — so that every real account shows — the samples reached a live
    // deck, and liking one wrote a match decision against a user id that is
    // not in `users`: a foreign key failure, a 500, a crashed screen.
    // The rule itself lives in domain/matching and is tested for behaviour in
    // deckCandidates.test.ts. This only checks the shell still goes through it.
    expect(shell).not.toContain('serverDiscoveredMatches ?? matches');
    wired(`const candidates = deckCandidates({
    serverDiscovered: serverDiscoveredMatches,
    samples: matches,
    signedIn: memberDataRuntime.source === "server",
  })`);
    wired('rankMatches(\n    candidates,');
  });

  it('keeps the sample people inside the signed-out showcase only', () => {
    // `matches` may still be imported for the showcase seed, but every use of
    // it has to sit in preview scaffolding, never in a signed-in path.
    const uses = [...shell.matchAll(/\bmatches\[/g)];
    for (const use of uses) {
      const line = shell.slice(
        shell.lastIndexOf('\n', use.index) + 1,
        shell.indexOf('\n', use.index),
      );
      const context = shell.slice(Math.max(0, use.index - 600), use.index);
      const inShowcase = /showcase|preview|couplePartner/i.test(context + line);
      expect(inShowcase, `sample data used outside the showcase: ${line.trim()}`).toBe(true);
    }
  });

  it('keeps local hydration and persistence behind the runtime policy', () => {
    wired('if (previewDataRuntime.allowsLocalHydration)');
    wired('if (!hydrated || !memberDataRuntime.allowsLocalPersistence) return;');
  });

  it('decides where member data lives from the session, not the build', () => {
    // A demo build with a signed-in member is still the server. Reading this
    // from the build alone kept their messages in local state.
    wired('const memberDataRuntime = evaluateMemberDataRuntime(');
    wired('backendRuntime.mode,');
    wired('!!accessToken');
  });

  it('keeps the preview routes out of a real runtime', () => {
    wired("backendRuntime.mode !== 'demo'");
    wired("new URLSearchParams(window.location.search).get('previewAccess') === '1'");
  });
});
