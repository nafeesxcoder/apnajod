import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { colors, palette } from './theme';

/**
 * The app wears the logo's colours.
 *
 * The identity moved from "Maroon & Gold" to the navy and crimson of the
 * Apnajoda mark. 1,809 literal colours across 28 screens moved with it, and
 * nothing stops one of them drifting back: a screen copied from an old
 * branch, a hex pasted from a stale mockup. A single maroon button on a navy
 * app does not crash anything and does not fail a typecheck - it just looks
 * broken, which is exactly the kind of thing that ships.
 *
 * So the retired identity is named here and kept out by name.
 */
const read = (path: string) => readFileSync(path, 'utf8');

function sourceFiles(dir: string, found: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, found);
    else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) found.push(path);
  }
  return found;
}

/** The old identity, by the constants that defined it. */
const RETIRED: Record<string, string> = {
  '#7A1028': 'the old maroon primary',
  '#4A0A18': 'the old pressed maroon',
  '#8A6722': 'the old gold accent',
  '#BF9230': 'the old bright gold',
  '#E9D6A8': 'the old gold tint',
  '#F8F3E9': 'the old warm cream canvas',
  '#1A1416': 'the old warm ink',
  '#E2D9CB': 'the old warm rule',
  '#B5405C': 'the old rose',
  '#E6286F': 'the original alarm pink',
};

describe('brand colours', () => {
  it('has no trace of the retired maroon and gold palette', () => {
    const offenders: string[] = [];
    for (const path of sourceFiles('src')) {
      const text = read(path).toUpperCase();
      for (const [hex, what] of Object.entries(RETIRED)) {
        if (text.includes(hex)) offenders.push(`${path}: ${hex} (${what})`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('has no retired colour hiding in an rgba()', () => {
    // Tints, shadows and hairlines are written as rgba, which the hex sweep
    // never matched: 709 of them kept the old maroon and gold while
    // everything opaque went navy, so the retired palette bled through the
    // new one. Both are named by their channels here.
    const retiredRgb: Record<string, string> = {
      '170,129,42': 'the old gold',
      '138,27,53': 'the old maroon',
      '233,30,99': 'the original alarm pink',
      '191,146,48': 'the old bright gold',
    };
    const offenders: string[] = [];
    for (const path of sourceFiles('src')) {
      const text = read(path).replace(/\s+/g, '');
      for (const [rgb, what] of Object.entries(retiredRgb)) {
        if (text.includes(`(${rgb},`) || text.includes(`(${rgb})`)) {
          offenders.push(`${path}: rgba(${rgb}) (${what})`);
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('builds the theme from the mark: navy acts, crimson accents', () => {
    expect(palette.navy).toBe('#1F4D7A');
    expect(palette.crimson).toBe('#A8243A');
    expect(palette.paperBase).toBe('#F5F6F8');
    // The legacy names the screens still import must follow the new palette,
    // or half the app stays on the old identity while the theme claims not
    // to be.
    expect(colors.pink).toBe(palette.navy);
    expect(colors.wine).toBe(palette.navy);
    expect(colors.accent).toBe(palette.crimson);
    expect(colors.canvas).toBe(palette.paperBase);
    expect(colors.black).toBe(palette.paperBase);
  });

  it('keeps danger apart from the brand red', () => {
    // Both are red. If they were the same red, a delete button and a like
    // button would be the same colour.
    expect(colors.danger).not.toBe(colors.accent);
  });
});

describe('app config', () => {
  const app = JSON.parse(read('app.json')).expo;

  it('is Apnajoda, not Milaan', () => {
    expect(app.name).toBe('Apnajoda');
    expect(app.slug).toBe('apnajoda');
    expect(app.scheme).toBe('apnajoda');
    expect(app.web.name).toBe('Apnajoda');
    expect(JSON.stringify(app)).not.toMatch(/milaan/i);
  });

  it('ships the brand colours to the OS chrome', () => {
    expect(app.primaryColor).toBe(palette.navy);
    expect(app.web.themeColor).toBe(palette.navy);
    expect(app.splash.backgroundColor).toBe(palette.paperBase);
    expect(app.android.adaptiveIcon.backgroundColor).toBe(palette.paperBase);
  });

  it('points at icons that exist', () => {
    for (const path of [
      app.icon,
      app.splash.image,
      app.web.favicon,
      app.android.adaptiveIcon.foregroundImage,
    ]) {
      expect(() => statSync(path.replace(/^\.\//, '')), `${path} missing`).not.toThrow();
    }
  });
});

/**
 * public/ is hand-written and sits outside everything else.
 *
 * It holds the real web template, the PWA manifest and the installed-app
 * icons, and it was the one place the rebrand missed: the app was already
 * navy and crimson while the browser tab, the install prompt and the home
 * screen still carried Milaan's icon and ink-black theme colour. Nothing in
 * the build complains, because none of it is TypeScript.
 */
describe('the web shell in public/', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  const html = read('public/index.html');
  const sw = read('public/sw.js');

  it('is Apnajoda in the manifest, the template and the worker', () => {
    expect(manifest.name).toBe('Apnajoda');
    expect(manifest.short_name).toBe('Apnajoda');
    expect(html).not.toMatch(/Milaan/i);
    expect(sw).not.toMatch(/Milaan/i);
  });

  it('wears the brand colours in the browser chrome', () => {
    expect(manifest.theme_color).toBe(palette.navy);
    expect(manifest.background_color).toBe(palette.paperBase);
    expect(html).toContain(`content="${palette.navy}"`);
    // The old ink-black theme colour painted the phone's status bar.
    expect(html).not.toContain('#1A1416');
  });

  it('ships a maskable icon, and every icon it names exists', () => {
    // Without one, Android draws the square icon inside its mask with a
    // white box around it.
    expect(
      manifest.icons.some((i: { purpose?: string }) => i.purpose?.includes('maskable')),
    ).toBe(true);
    for (const icon of manifest.icons) {
      const file = `public${icon.src}`;
      expect(() => statSync(file), `${file} missing`).not.toThrow();
    }
  });
});

describe('the old name is not on screen', () => {
  /**
   * app.json said Apnajoda while two screens still rendered "apnajod" in
   * their header - the app's own name, wrong, in the one place a member
   * looks to check whose app this is. The rebrand test only read app.json,
   * so nothing failed.
   */
  it('no screen renders the retired spelling', () => {
    const { readdirSync, readFileSync, statSync } = require('node:fs');
    const { join } = require('node:path');
    const screens: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules') continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        // .tsx only: a .ts test may legitimately use an old host name.
        else if (entry.endsWith('.tsx')) screens.push(path);
      }
    };
    walk('src');
    const offenders = screens.filter((path) =>
      /\bapnajod\b/i.test(readFileSync(path, 'utf8').replace(/apnajoda/gi, '')),
    );
    expect(offenders, `the old name is still on: ${offenders.join(', ')}`).toEqual([]);
  });
});
