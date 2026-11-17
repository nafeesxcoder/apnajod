import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The Home spin button shows the spin wheel picture instead of a gift icon.
describe('Home spin button icon', () => {
  it('uses the spin wheel image', () => {
    const widget = readFileSync(join(__dirname, 'HomeCoinsSpin.tsx'), 'utf8');
    expect(widget).toContain('require("../../../../assets/spin-wheel.png")');
    expect(widget).not.toContain('gift-outline');
    expect(existsSync(join(__dirname, '../../../../assets/spin-wheel.png'))).toBe(true);
  });
});
