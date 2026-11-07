import { describe, expect, it } from 'vitest';

import {
  APP_MAX_WIDTH,
  DESKTOP_MIN,
  PHONE_MAX,
  RAIL_WIDTH,
  WIDE_MIN,
  breakpointFor,
  layoutFor,
} from './breakpoints';

/**
 * The layout has to agree with itself at every width.
 *
 * The bug this guards against is not a wrong number, it is two numbers:
 * a nav that becomes a rail at 768 while the screen it sits on stays one
 * column until 900 leaves a 130px band where the rail covers the content.
 */
describe('breakpoints', () => {
  it('leaves no gap between phone and wide', () => {
    expect(WIDE_MIN).toBe(PHONE_MAX + 1);
  });

  it('calls a phone a phone', () => {
    expect(breakpointFor(390)).toBe('phone');
    expect(breakpointFor(PHONE_MAX)).toBe('phone');
  });

  it('turns wide at a tablet and desktop at a laptop', () => {
    expect(breakpointFor(WIDE_MIN)).toBe('tablet');
    expect(breakpointFor(1023)).toBe('tablet');
    expect(breakpointFor(DESKTOP_MIN)).toBe('desktop');
    expect(breakpointFor(1920)).toBe('desktop');
  });

  it('gives a tablet the rail but not the two-pane layouts', () => {
    const tablet = layoutFor(800);
    expect(tablet.isWide).toBe(true);
    expect(tablet.isDesktop).toBe(false);
  });

  it('gives a phone neither', () => {
    const phone = layoutFor(390);
    expect(phone.isWide).toBe(false);
    expect(phone.isDesktop).toBe(false);
  });

  it('gives a laptop both', () => {
    const laptop = layoutFor(1440);
    expect(laptop.isWide).toBe(true);
    expect(laptop.isDesktop).toBe(true);
  });

  it('leaves room for content beside the rail at the narrowest wide screen', () => {
    // A rail that eats most of a small tablet is worse than a bottom bar.
    expect(WIDE_MIN - RAIL_WIDTH).toBeGreaterThan(600);
  });

  it('stops the app growing before a line of chat becomes unreadable', () => {
    expect(APP_MAX_WIDTH).toBeGreaterThan(DESKTOP_MIN);
    expect(APP_MAX_WIDTH).toBeLessThanOrEqual(1600);
  });

  it('handles a zero width without claiming a desktop', () => {
    // useWindowDimensions can report 0 for a frame before layout.
    expect(layoutFor(0).breakpoint).toBe('phone');
  });
});
