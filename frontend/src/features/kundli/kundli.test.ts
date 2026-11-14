import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromBirth, gunBand, gunText, lahiriAyanamsa, moonLongitude, nakshatrasIn, rashisOf } from './kundli';

const read = (path: string) => readFileSync(join(__dirname, path), 'utf8');

describe('kundli', () => {
  it("finds the Moon where Meeus's worked example has it", () => {
    // Astronomical Algorithms, example 47.a: 1992 April 12, 0h TD.
    expect(moonLongitude(2448724.5)).toBeCloseTo(133.162655, 4);
  });

  it('uses the Lahiri ayanamsa, about 23.85 degrees in 2000', () => {
    expect(lahiriAyanamsa(2451545)).toBeCloseTo(23.853, 3);
    expect(lahiriAyanamsa(2451545 + 36525 / 4)).toBeCloseTo(24.2, 1);
  });

  it('works out Rashi and Nakshatra from a birth date and time, and they always agree', () => {
    const r = fromBirth('2000-01-01', '12:00');
    expect(r).not.toBeNull();
    expect(rashisOf(r!.nakshatra)).toContain(r!.rashi);
    for (let h = 0; h < 24; h += 5) {
      const x = fromBirth('1995-08-15', `${h}:30`)!;
      expect(rashisOf(x.nakshatra)).toContain(x.rashi);
    }
    expect(fromBirth('2000-01-01', '')).toBeNull();
    expect(fromBirth('2000-01-01', '25:00')).toBeNull();
  });

  it('only offers the Nakshatras of the chosen Rashi', () => {
    expect(nakshatrasIn(1)).toEqual([1, 2, 3]);
    expect(nakshatrasIn(2)).toEqual([3, 4, 5]);
    expect(nakshatrasIn(12)).toEqual([25, 26, 27]);
  });

  it('puts the score in gentle words: English, with the Hindi word alongside', () => {
    expect(gunBand(34, 36)).toMatchObject({ label: 'Excellent match', hindi: 'उत्तम' });
    expect(gunBand(28, 36)).toMatchObject({ label: 'Very good match', hindi: 'बहुत अच्छा' });
    expect(gunBand(20, 36)).toMatchObject({ label: 'Good match', hindi: 'अच्छा' });
    expect(gunBand(12, 36)).toMatchObject({ label: 'Low match', hindi: 'कम' });
    expect(gunText(23.5, 36)).toBe('23.5/36');
  });

  it('shows the badge on cards and profiles, the editor on my Profile, and keeps the kootas for Premium', () => {
    expect(read('../discovery/components/MatchCard.tsx')).toContain('<GunBadge gun={match.gun}');
    expect(read('../discovery/screens/MatchDetailScreen.tsx')).toContain('<GunBadge gun={match.gun}');
    // The profile page (from search, chats and matches) asks for it too.
    const person = read('../social/screens/PersonScreen.tsx');
    expect(person).toContain('kundliApi');
    expect(person).toContain('<GunBadge gun={gun} userId={userId} name={user.name} large />');
    // Optional: in Settings and Match Filters, not on the profile everyone sees.
    expect(read('../profile/screens/ProfileScreen.tsx')).not.toContain('Kundli');
    expect(read('../profile/screens/SettingsScreen.tsx')).toContain('label="Kundli & Gun Milan" onPress={openKundliEditor}');
    expect(read('../discovery/screens/DiscoveryCenterScreen.tsx')).toContain('title="Gun Milan (optional)"');
    const sheet = read('KundliSheet.tsx');
    expect(sheet).toContain('See every koota with Premium');
    expect(sheet).toContain('A traditional glimpse from Rashi and Nakshatra');
    const editor = read('KundliEditor.tsx');
    expect(editor).toContain('your birth time is never saved');
    // The app is in English: no Hinglish sentences left in the Kundli screens.
    for (const text of [sheet, editor]) {
      expect(text).not.toMatch(/Pata nahi|jodo|Aapka|Nikalo|milan dekho|Haan"|Nahi"/);
    }
    const app = read('../../app/MilaanApp.tsx');
    expect(app).toContain('<KundliHost accessToken={accessToken}');
  });
});
