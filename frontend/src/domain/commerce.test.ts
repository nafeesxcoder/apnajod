import { describe, expect, it } from 'vitest';
import { canAfford, spendCoins } from './commerce';

describe('coin wallet', () => {
  it('allows affordable positive-cost spends', () => expect(canAfford(100, 40)).toBe(true));
  it('rejects insufficient and invalid purchases', () => {
    expect(canAfford(20, 40)).toBe(false);
    expect(canAfford(100, 0)).toBe(false);
  });
  it('never creates a negative balance', () => {
    expect(spendCoins(20, 40)).toBe(20);
    expect(spendCoins(100, 40)).toBe(60);
  });
});

