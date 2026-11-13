import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, '../../..', path), 'utf8');

describe('Edit profile: username and selfie verification', () => {
  const edit = read('src/features/onboarding/screens/ProfileSetupScreen.tsx');
  const app = read('src/app/MilaanApp.tsx');

  it('shows the @username, read-only, with the verified icon once verified', () => {
    expect(edit).toContain('@{username}');
    expect(edit).toContain('{verified && <TrustBadge blueTick={blueTick} size={18} />}');
    expect(edit).not.toMatch(/onChangeText=\{[^}]*username/);
  });

  it('offers verification with what it is worth, says when it is under review, and hides the button then', () => {
    expect(edit).toContain('adds +15% to Profile strength');
    expect(edit).toContain('Under review');
    expect(edit).toContain('{!verified && verificationStatus !== "pending" && (');
  });

  it('goes to the pose selfie, but never in the middle of first sign-up', () => {
    expect(app).toContain('onVerify={accessToken && onboardingComplete ? () => navigateTo("verifyHub") : undefined}');
    expect(app).toContain('verificationStatus={verificationStatus}');
  });
});

describe('Navy x Crimson on the profile screens', () => {
  it('About and Looking for are info cards everywhere', () => {
    for (const file of [
      'src/features/profile/screens/ProfileScreen.tsx',
      'src/features/discovery/screens/MatchDetailScreen.tsx',
      'src/features/social/screens/PersonScreen.tsx',
    ]) {
      expect(read(file), file).toContain('<InfoCard title="About');
    }
    expect(read('src/components/IntentBadges.tsx')).toContain('<InfoCard title="Looking for"');
  });

  it('Like and Accept are crimson with a beating heart', () => {
    for (const file of [
      'src/features/discovery/screens/MatchDetailScreen.tsx',
      'src/features/social/screens/PersonScreen.tsx',
      'src/features/discovery/screens/LikesScreen.tsx',
    ]) {
      const source = read(file);
      expect(source, file).toMatch(/backgroundColor: (liked \? palette\.paper : )?palette\.crimson/);
      expect(source, file).toContain('<HeartBeat');
    }
  });

  it('chats needing a reply have a turning ring', () => {
    expect(read('src/features/social/screens/ChatsScreen.tsx')).toContain(
      'waiting={conversation.unread > 0 || isYourTurn(conversation)}',
    );
  });
});
