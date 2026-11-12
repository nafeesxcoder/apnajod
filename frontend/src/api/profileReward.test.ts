import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { onProfileReward, profileApi } from './profileApi';

const read = (path: string) => readFileSync(resolve(__dirname, '../..', path), 'utf8');

function reply(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('100% profile reward', () => {
  it('any save that earns it tells the app, once per reply', async () => {
    const heard: unknown[] = [];
    const stop = onProfileReward((reward) => heard.push(reward));
    reply({ ok: true, reward: { kind: 'superlike', quantity: 1 } });
    await profileApi.updatePhotos('t', ['https://x/p.jpg']);
    reply({ ok: true });
    await profileApi.updateIntent('t', { timeline: 'soon' });
    stop();
    reply({ ok: true, reward: { kind: 'superlike', quantity: 1 } });
    await profileApi.updateProfile('t', { firstName: 'Riya' });
    expect(heard).toEqual([{ kind: 'superlike', quantity: 1 }]);
  });

  it('the app celebrates, and the card promises the Super Like until it is paid', () => {
    const app = read('src/app/MilaanApp.tsx');
    expect(app).toContain('onProfileReward(() => {');
    expect(app).toContain('title: "Profile complete! 🎉"');
    const card = read('src/features/profile/components/ProfileStrengthCard.tsx');
    expect(card).toContain('Reach 100% and get a free Super Like.');
    expect(card).toContain('{!rewardClaimed && (');
    expect(card).toContain('Profile strength 100%');
  });

  it('listens above the fonts early return, so hooks never change between renders', () => {
    const app = read('src/app/MilaanApp.tsx');
    expect(app.indexOf('onProfileReward(() => {')).toBeLessThan(app.indexOf('if (!fontsLoaded)'));
  });
});
