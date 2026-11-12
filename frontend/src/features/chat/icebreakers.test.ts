import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, '../../..', path), 'utf8');

describe('icebreakers and your turn', () => {
  const chat = read('src/features/chat/ChatFeature.tsx');

  it('offers opening lines only in an empty chat, and only fills the box', () => {
    expect(chat).toContain('fetchIcebreakers(accessToken, conversationIdFor(match))');
    expect(chat).toContain('messages.length === 0 &&');
    // Tapping never sends on the member's behalf.
    expect(chat).toContain('onPress={() => setText(line)}');
  });

  it('never breaks the chat when the lines cannot load', () => {
    const api = read('src/api/chatApi.ts');
    const fn = api.slice(api.indexOf('export async function fetchIcebreakers'));
    expect(fn).toContain('if (!response.ok) return [];');
    expect(fn).toContain('catch {\n    return [];');
  });

  it('marks chats where the other person is waiting', () => {
    const list = read('src/features/social/screens/ChatsScreen.tsx');
    expect(list).toContain('message.mine === false');
    expect(list).toContain('Your turn');
  });
});

describe('waiting for a reply, inside the chat', () => {
  it('shows only when they spoke last over an hour ago', () => {
    const chat = read('src/features/chat/ChatFeature.tsx');
    expect(chat).toContain('lastShown.mine === false');
    expect(chat).toContain('Date.now() - lastShown.createdAt > 60 * 60 * 1000');
    expect(chat).toContain('is waiting for your reply');
  });
});
