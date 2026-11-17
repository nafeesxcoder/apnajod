import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { spinStatus } from './spinStatus';

const NOW = Date.UTC(2026, 10, 18, 12, 0, 0);

describe('the daily spin on Home', () => {
  it('is ready when it was never spun (server sends the epoch) or the 24 hours are up', () => {
    expect(spinStatus(new Date(0).toISOString(), NOW)).toEqual({ ready: true, label: 'Spin ready' });
    expect(spinStatus(new Date(NOW - 1000).toISOString(), NOW).ready).toBe(true);
  });

  it('says how long until the next spin, in hours and minutes', () => {
    const readyAt = new Date(NOW + (2 * 60 + 5) * 60_000).toISOString();
    expect(spinStatus(readyAt, NOW)).toEqual({ ready: false, label: 'Next spin in 2h 5m' });
  });

  it('shows minutes only under an hour, and "under a minute" at the end', () => {
    expect(spinStatus(new Date(NOW + 45 * 60_000).toISOString(), NOW).label).toBe('Next spin in 45m');
    expect(spinStatus(new Date(NOW + 20_000).toISOString(), NOW).label).toBe('Next spin in under a minute');
  });

  it('puts the coins and the spin in the Home header', () => {
    const home = readFileSync(join(__dirname, '..', 'screens', 'HomeScreen.tsx'), 'utf8');
    expect(home).toContain('import { HomeCoinsSpin } from "../components/HomeCoinsSpin";');
    expect(home).toContain('<HomeCoinsSpin accessToken={accessToken} onOpenGames={() => navigate("games")} />');
  });
});
