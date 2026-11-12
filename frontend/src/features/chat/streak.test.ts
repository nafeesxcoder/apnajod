import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, '../../..', path), 'utf8');

describe('chat streaks', () => {
  const chat = read('src/features/chat/ChatFeature.tsx');
  const list = read('src/features/social/screens/ChatsScreen.tsx');

  it('shows 🔥 in the chat header and the Chats list, only once it counts', () => {
    expect(chat).toContain('{!!streak?.show && (');
    expect(list).toContain('{!!conversation.streak?.show && (');
  });

  it('warns with ⏳ when today is still missing', () => {
    expect(chat).toContain('streak.atRisk ? " ⏳" : ""');
    expect(list).toContain("conversation.streak.atRisk ? ' ⏳' : ''");
  });

  it('re-reads the streak after new messages', () => {
    expect(chat).toContain('[accessToken, match.id, experienceMode, messages.length]');
  });

  it('never breaks the chat if the streak cannot load', () => {
    const api = read('src/api/chatApi.ts');
    const fn = api.slice(api.indexOf('export async function fetchStreak'));
    expect(fn).toContain('if (!response.ok) return null;');
    expect(fn).toContain('catch {\n    return null;');
  });
});
