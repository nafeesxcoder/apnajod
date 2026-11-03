import { describe, expect, it } from 'vitest';
import { buildCatalogGifUri, buildStickerPayload, chatGifCatalog, chatGifCatalogCount, classifyEmojiMotion, customChatStickers, parseCatalogGifUri, parseStickerPayload, searchChatGifCatalog } from './chatMediaCatalog';

describe('chat media catalog',()=>{
  it('ships 1,000 searchable GIF entries',()=>{
    expect(chatGifCatalogCount).toBe(1000);
    expect(chatGifCatalog).toHaveLength(1000);
    expect(new Set(chatGifCatalog.map(item=>item.id)).size).toBe(1000);
    expect(chatGifCatalog.every(item=>item.uri.startsWith('milaan-gif:'))).toBe(true);
  });

  it('finds common daily-use GIF intents and synonyms',()=>{
    expect(searchChatGifCatalog('good morning').slice(0,20).every(item=>item.title==='Good morning')).toBe(true);
    expect(searchChatGifCatalog('hug').slice(0,20).every(item=>item.title==='Big hug')).toBe(true);
    expect(searchChatGifCatalog('kiss').slice(0,20).every(item=>item.title==='Kiss')).toBe(true);
    expect(searchChatGifCatalog('love').some(item=>item.title==='Love')).toBe(true);
  });

  it('round-trips custom sticker payloads',()=>{
    const sticker=customChatStickers[0]!;
    expect(parseStickerPayload(buildStickerPayload(sticker))).toMatchObject({id:sticker.id,emoji:sticker.emoji,label:sticker.label,motion:sticker.motion});
  });

  it('round-trips first-party GIF messages without embedding 1,000 binary files',()=>{
    const gif=chatGifCatalog[437]!;
    expect(parseCatalogGifUri(buildCatalogGifUri(gif))).toEqual(gif);
    expect(parseCatalogGifUri('https://media.example/reaction.gif')).toBeNull();
    expect(parseCatalogGifUri('milaan-gif:missing')).toBeNull();
  });

  it('maps emotional emoji to distinct motions',()=>{
    expect(classifyEmojiMotion('😂')).toBe('laugh');
    expect(classifyEmojiMotion('😭')).toBe('cry');
    expect(classifyEmojiMotion('❤️')).toBe('love');
    expect(classifyEmojiMotion('🤗')).toBe('love');
    expect(classifyEmojiMotion('😘')).toBe('kiss');
    expect(classifyEmojiMotion('😡')).toBe('angry');
  });
});
