import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The verified badge is the one thing this app is really selling: "everyone
 * here is checked by a person". That promise breaks in two quiet ways, and
 * both were live in the build this guards.
 *
 * 1. The shield was drawn on every card, verified or not. A trust mark that
 *    means nothing is worse than no mark, because people read it as checked.
 * 2. The app read only `verified` and never `verification_status`, so someone
 *    whose selfie was already waiting in the review queue was shown "not
 *    started" and told to upload again.
 *
 * These read the source rather than render it: what is being checked is the
 * wiring — which branch supplies the badge, and where the status comes from.
 */
const read = (path: string) => readFileSync(path, 'utf8');
const compact = (value: string) => value.replace(/\s+/g, '');

const shell = read('src/app/MilaanApp.tsx');
const socialMatch = read('src/domain/socialMatch.ts');

/**
 * Every screen that can put a trust mark on a person. Checking only two of
 * them is how an unguarded shield survived on the member's own profile: the
 * mark was fixed where it was looked for, not everywhere it was drawn.
 */
const screensThatMarkPeople = [
  'src/features/discovery/components/MatchCard.tsx',
  'src/features/discovery/screens/MatchDetailScreen.tsx',
  'src/features/profile/screens/ProfileScreen.tsx',
  'src/features/social/screens/PersonScreen.tsx',
  'src/features/discovery/screens/LikesScreen.tsx',
  'src/features/discovery/screens/HomeScreen.tsx',
];

/**
 * Any tick at all on these screens, plus the word itself.
 *
 * Naming the spellings was tried twice and missed twice: first
 * `name="checkmark"` on an avatar, then `checkmark-circle` beside a name.
 * The same badge keeps arriving drawn a different way, so this matches every
 * checkmark icon in these files. None of them is a read receipt or a
 * selection tick - those live in the chat and the sign-up screens, which are
 * not in this list - so a checkmark here is always a claim about a person.
 */
const TRUST_MARKS = /name="[a-z-]*checkmark[a-z-]*"|name="verified"|<TrustBadge|>\s*Verified\s*</g;

describe('the verified badge', () => {
  it('is drawn only for someone who is actually verified', () => {
    let found = 0;
    for (const path of screensThatMarkPeople) {
      const text = compact(read(path));
      for (const mark of [...text.matchAll(TRUST_MARKS)]) {
        found += 1;
        const before = text.slice(Math.max(0, mark.index - 320), mark.index);
        expect(
          /(match\.)?verified&&/.test(before),
          `${path}: a trust mark is drawn without checking verified`,
        ).toBe(true);
      }
    }
    expect(found, 'no trust marks found - has the markup changed?').toBeGreaterThan(3);
  });

  it('does not invent verification for someone found by username', () => {
    // The follow graph carries no selfie review, so an adapted person is
    // never verified by default.
    expect(compact(socialMatch)).toContain('verified:false');
  });
});

describe('submitting a selfie', () => {
  it('uploads the file before recording it', () => {
    // ImagePicker returns a device-local reference (file:// or blob:).
    // Storing that means the review queue holds a path nobody but that
    // handset can open, so the selfie can never actually be looked at.
    const handler = shell.slice(
      shell.indexOf('onVerify={async (uri)'),
      shell.indexOf('Selfie submitted'),
    );
    expect(handler.length).toBeGreaterThan(0);
    const uploadAt = handler.indexOf('uploadPhoto(uri, accessToken)');
    const submitAt = handler.indexOf('profileApi.submitVerification(');
    expect(uploadAt, 'the selfie is submitted without being uploaded').toBeGreaterThan(-1);
    expect(submitAt).toBeGreaterThan(uploadAt);
    expect(
      /submitVerification\(accessToken,\s*uri\)/.test(handler),
      'the raw picker uri is being recorded instead of the uploaded url',
    ).toBe(false);
  });
});

describe('the verification status', () => {
  it('is read from the server, not only set locally on submit', () => {
    // Setting it to 'pending' after an upload is not enough: on the next
    // load the server is the only thing that knows.
    expect(compact(shell)).toContain('verification_status');
    expect(compact(shell)).toContain('constapplyVerificationFrom=');
  });

  it('uses one reader everywhere the profile arrives', () => {
    // Three separate load paths set this. Reading `verified` straight off a
    // profile row in any of them is how the two drifted apart before.
    const direct = [...shell.matchAll(/setVerified\(/g)].map((match) => {
      const line = shell.slice(
        shell.lastIndexOf('\n', match.index) + 1,
        shell.indexOf('\n', match.index),
      );
      return line.trim();
    });
    for (const line of direct) {
      expect(
        line.includes('applyVerificationFrom') ||
          !/profile|member/i.test(line),
        `a profile load sets verified without the status: ${line}`,
      ).toBe(true);
    }
  });
});

describe('the blue tick', () => {
  const badge = compact(read('src/components/TrustBadge.tsx'));
  const premium = read('src/features/premium/screens/PremiumScreen.tsx');

  it('never draws for someone who is not verified, even if paid', () => {
    // Paying alone must not buy "this person is real".
    expect(badge).toContain('if(!verified)returnnull;');
  });

  it('is offered with the selfie requirement stated before paying', () => {
    expect(premium).toContain('The blue tick needs a verified selfie');
    expect(premium).toContain('onVerify');
  });
});
