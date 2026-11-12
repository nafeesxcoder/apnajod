import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { average, dayLabel, percent, rupees, total } from './growthFormat';

const read = (path: string) => readFileSync(resolve(__dirname, '../../..', path), 'utf8');

describe('admin growth page', () => {
  it('is a tab right after Overview', () => {
    const screen = read('src/features/admin/screens/AdminDashboardScreen.tsx');
    expect(screen).toContain('{ key: "growth", label: "Growth", icon: "trending-up-outline" }');
    expect(screen).toContain('{tab === "growth" && <GrowthTab accessToken={accessToken} />}');
  });

  it('formats days, money and shares in plain words', () => {
    expect(dayLabel('2026-11-12')).toBe('12 Nov');
    expect(dayLabel(undefined)).toBe('');
    expect(rupees(24900)).toBe('₹249');
    expect(rupees(0)).toBe('₹0');
    expect(total([1, 2, 3])).toBe(6);
    expect(average([1, 2])).toBe(1.5);
    expect(average([])).toBe(0);
    expect(percent(31, 57)).toBe(54);
    expect(percent(5, 0)).toBe(0);
  });

  it('averages daily actives only over days that were being counted', () => {
    const tab = read('src/features/admin/screens/GrowthTab.tsx');
    expect(tab).toContain('>= (growth.activeTrackingSince ?? "")');
  });
});
