import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const chats = readFileSync(join(__dirname, 'screens', 'ChatsScreen.tsx'), 'utf8');
const api = readFileSync(join(__dirname, '..', '..', 'api', 'chatApi.ts'), 'utf8');

describe('green dot in the chat list', () => {
  it('asks the server who is online for the shown chats, every 30 seconds', () => {
    expect(api).toContain('`/chat/presence?ids=${encodeURIComponent(userIds.join(","))}`');
    expect(chats).toContain('.presenceFor(accessToken, onlineKey.split(","))');
    expect(chats).toContain('setInterval(check, 30_000)');
  });

  it('draws the dot on the avatar only for members who are online', () => {
    expect(chats).toContain('online={!!onlineIds[conversation.user.userId]}');
    expect(chats).toContain('accessibilityLabel="Online"');
  });
});
