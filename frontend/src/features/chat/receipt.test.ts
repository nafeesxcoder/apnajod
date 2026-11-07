import { describe, expect, it } from 'vitest';

import { receiptColor, receiptIcon, receiptLabel, TICK_PENDING } from './receipt';

/**
 * A read message must actually show blue ticks.
 *
 * The server was delivering the read receipt correctly and the client was
 * listening for it - but the tick was painted #898F96, a mid grey, on the
 * navy bubble it sits on. Reading a message made its ticks go dimmer than
 * the unread tick beside it, so the whole feature looked dead, on a screen
 * whose own accessibility label reads "Read · blue ticks".
 */
const channels = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

describe('message receipt', () => {
  it('turns blue once the message is read', () => {
    const read = receiptColor('read');
    expect(read).not.toBe(TICK_PENDING);
    const { r, g, b } = channels(read);
    expect(b, `${read} should be blue-dominant`).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
    // Grey has its three channels close together. That is what shipped.
    expect(b - r, `${read} is too grey to read as a blue tick`).toBeGreaterThan(60);
  });

  it('stands out against the navy bubble it sits on', () => {
    // The own-message bubble is #174069. A dark blue here is invisible.
    const { r, g, b } = channels(receiptColor('read'));
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    expect(luminance, 'the read tick must be lighter than its bubble').toBeGreaterThan(0.5);
  });

  it('leaves sent and delivered on the pending colour', () => {
    expect(receiptColor('sent')).toBe(TICK_PENDING);
    expect(receiptColor('delivered')).toBe(TICK_PENDING);
  });

  it('shows one tick when sent and two after that', () => {
    expect(receiptIcon('sent')).toBe('checkmark');
    expect(receiptIcon('delivered')).toBe('checkmark-done');
    expect(receiptIcon('read')).toBe('checkmark-done');
  });

  it('describes what it draws', () => {
    // The label promised blue while the colour was grey; keep them honest.
    expect(receiptLabel('read')).toMatch(/blue/i);
    expect(receiptLabel('sent')).toMatch(/one tick/i);
    expect(receiptLabel('delivered')).toMatch(/two ticks/i);
  });
});
