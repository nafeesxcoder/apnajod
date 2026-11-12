import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chatPrimaryAttachments } from '../../../domain/featureFocus';

const read = (path: string) => readFileSync(resolve(__dirname, '../../../..', path), 'utf8');

describe('play-together games', () => {
  const chat = read('src/features/chat/ChatFeature.tsx');
  const games = read('src/features/chat/games/LiveGames.tsx');

  it('are two taps from any chat: paperclip, then Games', () => {
    expect(chatPrimaryAttachments.map((item) => item.id)).toContain('games');
  });

  it('are offered only in a real signed-in chat, not couple mode', () => {
    expect(chat).toContain('accessToken && !isCoupleMode ? (kind) => void startLiveGame(kind) : undefined');
  });

  it('can be started straight from an empty chat', () => {
    expect(chat).toContain('Or start with a quick game');
  });

  it('show their card in the chat and open from it', () => {
    expect(chat).toContain('message.type === "game" && !!message.game');
    expect(chat).toContain('onOpenLiveGame(message.game!.id)');
  });

  it('offer all four games', () => {
    for (const kind of ['this_or_that', 'know_me', 'would_you_rather', 'tic_tac_toe']) {
      expect(games).toContain(`kind: "${kind}"`);
    }
  });

  it('keep checking for the other move only while waiting on them', () => {
    expect(games).toContain('if (!gameId || !waiting) return;');
  });

  it('never hide the partner answers behind the client alone - the server sends them only after both answer', () => {
    // The screen reads partnerPicks / truth only from what the server sent.
    expect(games).not.toMatch(/partnerPicks\s*=/);
    expect(games).toContain('game.partnerPicks?.[i]');
  });
});
