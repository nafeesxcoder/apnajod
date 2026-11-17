import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseStickerPayload } from '../../domain/chatMediaCatalog';

const chats = readFileSync(join(__dirname, 'screens', 'ChatsScreen.tsx'), 'utf8');

describe('sticker preview in the chat list', () => {
  it('decodes the sticker payload into its emoji and label', () => {
    const sticker = parseStickerPayload(
      '✨STICKER|slow-clap|%F0%9F%91%8F|SLOW%20CLAP|Honestly%E2%80%A6%20impressive.|gold|celebrate',
    );
    expect(sticker?.emoji).toBe('👏');
    expect(sticker?.label).toBe('SLOW CLAP');
  });

  it('shows the sticker instead of the raw payload', () => {
    expect(chats).toContain("import { parseStickerPayload } from '../../../domain/chatMediaCatalog';");
    expect(chats).toContain('function stickerPreview(text: string): string | null {');
    expect(chats).toContain('if (message.text) return stickerPreview(message.text) ?? message.text;');
  });

  it('falls back to "Sticker" when the payload cannot be decoded', () => {
    expect(chats).toContain("return text.startsWith('✨STICKER|') ? 'Sticker' : null;");
  });
});
