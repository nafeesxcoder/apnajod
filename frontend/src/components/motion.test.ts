import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, '../..', path), 'utf8');

describe('Navy x Crimson look and motion', () => {
  it('every animation stands still when the phone asks for less motion', () => {
    const motion = read('src/components/motion.tsx');
    expect(motion).toContain('AccessibilityInfo.isReduceMotionEnabled()');
    // Each moving piece checks it.
    // Reveal is plain now: cards just appear, so it has nothing to move.
    const reveal = motion.slice(motion.indexOf('export function Reveal'), motion.indexOf('/**', motion.indexOf('export function Reveal')));
    expect(reveal).not.toContain('Animated');
    for (const piece of ['export function PressScale', 'export function SpinRing', 'export function HeartBeat', 'export function GlowPulse']) {
      const body = motion.slice(motion.indexOf(piece), motion.indexOf('\nexport function', motion.indexOf(piece) + 10) >>> 0 || undefined);
      expect(body, piece).toContain('useReducedMotion()');
    }
  });

  it('Home cards arrive one after another and use the shared look', () => {
    const home = read('src/features/discovery/screens/HomeScreen.tsx');
    const delays = [...home.matchAll(/<Reveal delay=\{(\d+)\}/g)].map((m) => Number(m[1]));
    expect(delays.length).toBeGreaterThanOrEqual(4);
    expect([...delays].sort((a, b) => a - b)).toEqual(delays);
    expect(read('src/features/discovery/components/DailyQuestionCard.tsx')).toContain('colors={brand.heroGradient}');
    expect(read('src/features/discovery/components/DailyPicksRow.tsx')).toContain('<SpinRing');
  });

  it('text on the navy hero is readable', () => {
    // White and the soft pink both pass 4.5:1 on the burgundy hero #B0245F.
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
    };
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x! + 0.05) / (y! + 0.05);
    };
    expect(ratio('#FFFFFF', '#B0245F')).toBeGreaterThan(4.5);
    expect(ratio('#FBE3EE', '#B0245F')).toBeGreaterThan(4.5);
  });
});
