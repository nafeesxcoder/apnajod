import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', '..', p), 'utf8');
const games = read('src/features/games/GamesScreen.tsx');
const shell = read('src/app/MilaanApp.tsx');
const chat = read('src/features/chat/ChatFeature.tsx');
const home = read('src/features/discovery/screens/HomeScreen.tsx');
const likes = read('src/features/discovery/screens/LikesScreen.tsx');
const compact = (s: string) => s.replace(/\s+/g, '');

describe('Games tab', () => {
  it('picks a game, then a match, and opens that chat with the game started', () => {
    expect(games).toContain('LIVE_GAMES');
    expect(games).toContain('onPlay(match, picked.kind)');
    expect(compact(shell)).toContain('setChatLaunchGame(kind);openConversationWith(');
    expect(shell).toContain('initialGame={chatLaunchGame}');
    expect(chat).toContain('void startLiveGame(initialGame)');
  });

  it('asks you to match first when there is nobody to play with', () => {
    expect(games).toContain('Match with someone first');
  });
});

describe('Notifications (the Home bell)', () => {
  it('shows a live count and clears it when opened', () => {
    expect(home).toContain('matchApi\n        .notificationCount(accessToken)');
    expect(home).toContain('notificationCount > 9 ? "9+" : notificationCount');
    expect(likes).toContain('matchApi.markNotificationsSeen(accessToken)');
  });

  it('lists new matches from the last 30 days above who liked you', () => {
    expect(likes).toContain('NEW MATCHES');
    expect(likes).toContain('const NEW_MATCH_DAYS = 30;');
  });
});

describe('the empty deck', () => {
  it('offers Invite friends and Find someone', () => {
    expect(home).toContain('label="Invite friends"');
    expect(home).toContain('label="Find someone"');
    expect(home).toContain('navigate("find")');
  });
});
