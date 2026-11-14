import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FESTIVAL_THEMES, festivalFor, greetingLine, particlesKey } from './themes';
import { stepTheme, TEXT_THEMES, textThemesWith } from '../stories/editor/themes';

/**
 * Festival themes: the admin puts Diwali, Eid and the rest on the whole
 * app with one click; Home greets, decorates and offers festive stories.
 */
describe('festival themes', () => {
  it('has the eight festivals, each complete', () => {
    expect(Object.keys(FESTIVAL_THEMES)).toEqual([
      'diwali', 'eid_ul_fitr', 'eid_ul_adha', 'holi', 'christmas', 'new_year', 'valentines', 'raksha_bandhan',
    ]);
    for (const theme of Object.values(FESTIVAL_THEMES)) {
      expect(theme.colors).toHaveLength(2);
      expect(theme.greeting.length).toBeGreaterThan(3);
      expect(theme.textStories.length).toBeGreaterThan(0);
      expect((theme.particles.emoji ?? theme.particles.dots ?? []).length).toBeGreaterThan(0);
    }
  });

  it("uses the admin's greeting, or the theme's own", () => {
    const base = { id: '1', startsAt: null, endsAt: null };
    expect(festivalFor({ ...base, themeKey: 'diwali', greeting: null })?.greeting).toBe('Happy Diwali');
    expect(festivalFor({ ...base, themeKey: 'diwali', greeting: 'Shubh Deepavali' })?.greeting).toBe('Shubh Deepavali');
    expect(festivalFor({ ...base, themeKey: 'unknown', greeting: null })).toBeNull();
    expect(festivalFor(null)).toBeNull();
  });

  it('drops a theme whose end has passed while the app was open', () => {
    expect(
      festivalFor({ id: '1', themeKey: 'holi', greeting: null, startsAt: null, endsAt: new Date(Date.now() - 1000).toISOString() }),
    ).toBeNull();
  });

  it('greets by first name', () => {
    expect(greetingLine('Eid Mubarak', 'Aarav Sharma')).toBe('Eid Mubarak, Aarav!');
    expect(greetingLine('Eid Mubarak', '')).toBe('Eid Mubarak!');
  });

  it('shows the falling decoration once a day per festival', () => {
    expect(particlesKey('diwali', new Date('2026-11-08T10:00:00Z'))).toBe('apnajoda.festival.diwali.2026-11-08');
  });

  it('puts the festival story backgrounds first while it is on', () => {
    const list = textThemesWith(FESTIVAL_THEMES.diwali!);
    expect(list[0]!.name).toBe('Diwali Night');
    expect(list).toHaveLength(TEXT_THEMES.length + 3);
    expect(stepTheme(list.length - 1, 1, list.length)).toBe(0);
    expect(textThemesWith(null)).toBe(TEXT_THEMES);
  });

  it('is on Home, in the app shell, and in the admin', () => {
    const home = readFileSync(join(__dirname, '../discovery/screens/HomeScreen.tsx'), 'utf8');
    expect(home).toContain('<FestivalBanner');
    expect(home).toContain('<FestivalParticles');
    const app = readFileSync(join(__dirname, '../../app/MilaanApp.tsx'), 'utf8');
    expect(app).toContain('startFestivalWatch()');
    expect(app).toContain('socket.on("app:theme", onTheme)');
    const admin = readFileSync(join(__dirname, '../admin/screens/AdminDashboardScreen.tsx'), 'utf8');
    expect(admin).toContain('{ key: "festivals", label: "Festival Themes"');
    expect(admin).toContain('adminApi.scheduleFestival');
    expect(admin).toContain('adminApi.stopFestival');
    const particles = readFileSync(join(__dirname, 'FestivalParticles.tsx'), 'utf8');
    expect(particles).toContain('isReduceMotionEnabled');
    expect(particles).toContain('pointerEvents="none"');
  });
});
