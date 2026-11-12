import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, '../../..', path), 'utf8');
const compact = (source: string) => source.replace(/\s+/g, '');

describe('Sparks and Super Likes', () => {
  const app = read('src/app/MilaanApp.tsx');

  it('signed in, the Spark count comes from the server, not the phone', () => {
    // The phone ledger is what let a reinstall hand out a second free Spark.
    expect(compact(app)).toContain('constroseAvailability:RoseAvailability=accessToken?{freeAvailable:sparkWallet?.freeSparkAvailable??false');
    expect(app).toContain('matchApi.sendSpark(accessToken');
  });

  it('no longer tells signed-in members Sparks are switched off', () => {
    expect(app).not.toContain('Golden Sparks remain disabled');
  });

  it('offers a Super Like separately, and sends people to buy one when they have none', () => {
    const sheet = read('src/features/chat/ChatFeature.tsx');
    expect(sheet).toContain('Send as Super Like');
    expect(sheet).toContain('onBuySuperLikes');
  });

  it('shows who sent a Spark or Super Like in Likes, with their note', () => {
    const likes = read('src/features/discovery/screens/LikesScreen.tsx');
    expect(likes).toContain('⭐ Super Like');
    expect(likes).toContain('like.spark.note');
  });
});

describe('the Daily Question', () => {
  it('sits on Home for signed-in members and refreshes the Spark count after a reward', () => {
    const home = read('src/features/discovery/screens/HomeScreen.tsx');
    expect(home).toContain('<DailyQuestionCard');
    expect(read('src/app/MilaanApp.tsx')).toContain('onSparkRewarded={() => void refreshSparkWallet()}');
  });

  it('never breaks Home when the question cannot load', () => {
    const card = compact(read('src/features/discovery/components/DailyQuestionCard.tsx'));
    expect(card).toContain('if(!accessToken||!today?.question)returnnull;');
  });

  it('can be managed from the admin panel', () => {
    expect(read('src/features/admin/screens/AdminDashboardScreen.tsx')).toContain('function QuestionsTab');
  });
});

describe('the app shell', () => {
  it('calls no hooks after the fonts early return', () => {
    // A hook placed after `if (!fontsLoaded) return` only runs once the
    // fonts are in, React sees a different hook count between renders and
    // the whole app falls over (React error #310). This took the live site
    // down once.
    const app = read('src/app/MilaanApp.tsx');
    const start = app.indexOf('function MilaanApp()');
    const early = app.indexOf('if (!fontsLoaded)', start);
    const end = app.indexOf('\nexport default function App', early);
    expect(start).toBeGreaterThan(-1);
    expect(early).toBeGreaterThan(start);
    const afterReturn = app.slice(early, end);
    const hookCalls = afterReturn.match(/^ {2}(?:const [^=]+= )?use[A-Z]\w*\(/gm) ?? [];
    expect(hookCalls).toEqual([]);
  });
});
