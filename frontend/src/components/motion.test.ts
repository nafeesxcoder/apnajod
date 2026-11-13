import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, '../..', path), 'utf8');

describe('Navy x Crimson look and motion', () => {
  it('every animation stands still when the phone asks for less motion', () => {
    const motion = read('src/components/motion.tsx');
    expect(motion).toContain('AccessibilityInfo.isReduceMotionEnabled()');
    // Each moving piece checks it.
    for (const piece of ['export function Reveal', 'export function PressScale', 'export function SpinRing', 'export function HeartBeat', 'export function GlowPulse']) {
      const body = motion.slice(motion.indexOf(piece), motion.indexOf('\nexport function', motion.indexOf(piece) + 10) >>> 0 || undefined);
      expect(body, piece).toContain('useReducedMotion()');
    }
  });

  it('Home cards arrive one after another and use the shared look', () => {
    const home = read('src/features/discovery/screens/HomeScreen.tsx');
    const delays = [...home.matchAll(/<Reveal delay=\{(\d+)\}/g)].map((m) => Number(m[1]));
    expect(delays.length).toBeGreaterThanOrEqual(5);
    expect([...delays].sort((a, b) => a - b)).toEqual(delays);
    expect(home).toContain('<GlowPulse color={palette.crimson}');
    expect(read('src/features/discovery/components/DailyQuestionCard.tsx')).toContain('colors={brand.heroGradient}');
    expect(read('src/features/discovery/components/DailyPicksRow.tsx')).toContain('<SpinRing');
    expect(read('src/features/discovery/components/IntentPassportCard.tsx')).toContain('colors={brand.barGradient}');
  });

  it('text on the navy hero is readable', () => {
    // White and the soft blue-grey both pass 4.5:1 on navy #1F4D7A.
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
    };
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x! + 0.05) / (y! + 0.05);
    };
    expect(ratio('#FFFFFF', '#1F4D7A')).toBeGreaterThan(4.5);
    expect(ratio('#C9D8E8', '#1F4D7A')).toBeGreaterThan(4.5);
  });
});
