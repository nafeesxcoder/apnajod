import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The coin emoji draws as an empty box on some fonts, so coins are written
// as the word "coins" and the chip shows a gold coin image instead.
const files = ['LudoScreen.tsx', 'LudoEntry.tsx', 'LudoStore.tsx', 'DailySpin.tsx'];

describe('coins are never drawn with the coin emoji', () => {
  it('uses no coin emoji in the Ludo screens', () => {
    for (const name of files) {
      const source = readFileSync(join(__dirname, name), 'utf8');
      expect(source, name).not.toContain('🪙');
    }
  });

  it('shows the gold coin image as the chip icon', () => {
    const store = readFileSync(join(__dirname, 'LudoStore.tsx'), 'utf8');
    expect(store).toContain('<CoinIcon size={size} />');
    expect(store).toContain('export function CoinIcon(');
    expect(store).toContain('require("../../../assets/coin.png")');
    expect(existsSync(join(__dirname, '../../../assets/coin.png'))).toBe(true);
  });
});
