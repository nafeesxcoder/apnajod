import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The coin emoji draws as an empty box on some fonts, so coins are written
// as the word "coins" and the chip draws its own gold coin.
const files = ['LudoScreen.tsx', 'LudoEntry.tsx', 'LudoStore.tsx', 'DailySpin.tsx'];

describe('coins are never drawn with the coin emoji', () => {
  it('uses no coin emoji in the Ludo screens', () => {
    for (const name of files) {
      const source = readFileSync(join(__dirname, name), 'utf8');
      expect(source, name).not.toContain('🪙');
    }
  });

  it('draws the coin chip icon as a small stack of gold coins', () => {
    const store = readFileSync(join(__dirname, 'LudoStore.tsx'), 'utf8');
    expect(store).toContain('<CoinStack size={size} />');
    expect(store).toContain('export function CoinStack(');
  });
});
