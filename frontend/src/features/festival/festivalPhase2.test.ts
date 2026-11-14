import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { alreadyWished, FESTIVAL_THEMES, festivalEmojis } from './themes';

const read = (path: string) => readFileSync(join(__dirname, path), 'utf8');

describe('festival themes, part two', () => {
  it('sends a festival wish card from chat, once per festival per chat', () => {
    const chat = read('../chat/ChatFeature.tsx');
    expect(chat).toContain('<FestivalWishChip theme={festival} onSend={sendFestivalWish} />');
    expect(chat).toContain('createMessage({ type: "festival", festival: { themeKey: festival.key, greeting: festival.greeting } })');
    expect(chat).toContain('<FestivalWishCard wish={message.festival} mine={mine} />');
    const wish = { themeKey: 'diwali', greeting: 'Happy Diwali' };
    expect(alreadyWished([{ mine: true, type: 'festival', festival: wish }], 'diwali')).toBe(true);
    expect(alreadyWished([{ mine: false, type: 'festival', festival: wish }], 'diwali')).toBe(false);
    expect(alreadyWished([{ mine: true, type: 'festival', festival: wish }], 'holi')).toBe(false);
    expect(read('../social/screens/ChatsScreen.tsx')).toContain("case 'festival':");
  });

  it('puts festival stickers first in stories', () => {
    expect(festivalEmojis(FESTIVAL_THEMES.diwali!)).toEqual(['🪔', '✨', '🎆']);
    const sheet = read('../stories/editor/StickerSheet.tsx');
    expect(sheet).toContain('onPick("greeting", `${festival.emoji} ${festival.greeting}`)');
    expect(read('../stories/editor/StoryEditor.tsx')).toContain('festival={stickers ? currentFestival() : null}');
  });

  it('shows the festival offer on Premium with the old price struck through', () => {
    const premium = read('../premium/screens/PremiumScreen.tsx');
    expect(premium).toContain('accessibilityLabel="Festival offer"');
    expect(premium).toContain('textDecorationLine: "line-through"');
  });

  it('lets the admin set an offer and send the greeting to everyone, with a second tap to confirm', () => {
    const admin = read('../admin/screens/AdminDashboardScreen.tsx');
    expect(admin).toContain('const FESTIVAL_OFFERS: (number | null)[] = [null, 10, 20, 30];');
    expect(admin).toContain('adminApi.pushFestival(accessToken, pushText)');
    expect(admin).toContain('"Yes, send to everyone"');
  });
});
