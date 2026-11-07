import { describe, expect, it } from 'vitest';

import { coveredHeight } from './keyboardInset';

/**
 * The keyboard's height, measured from the browser's visual viewport.
 *
 * React Native's KeyboardAvoidingView takes no behaviour on the web, so
 * on a phone browser the keyboard opened straight over the composer and
 * the emoji / GIF panel - including the search field that had just been
 * tapped to open it. You could type and not see a thing.
 *
 * Everything here is a case that would put the composer in the wrong
 * place if it were read naively.
 */
describe('the keyboard inset', () => {
  it('is the part of the window the keyboard covers', () => {
    expect(coveredHeight(844, 508)).toBe(336);
  });

  it('is nothing when no keyboard is open', () => {
    expect(coveredHeight(844, 844)).toBe(0);
  });

  it('ignores the few pixels a browser reports with no keyboard', () => {
    // Toolbars and rounding leave small differences that are not a
    // keyboard, and padding by them makes the composer jitter.
    expect(coveredHeight(844, 836)).toBe(0);
    expect(coveredHeight(844, 800)).toBe(0);
  });

  it('subtracts the scroll offset rather than counting it as keyboard', () => {
    // Scrolling inside the visual viewport moves offsetTop. Counting it
    // leaves a gap above the keyboard that grows as the page scrolls.
    expect(coveredHeight(844, 508, 120)).toBe(216);
  });

  it('never goes negative when a toolbar slides away', () => {
    expect(coveredHeight(844, 900)).toBe(0);
  });

  it('refuses a measurement taller than the window', () => {
    // Padding by this would push the composer off the top of the screen,
    // which is worse than the bug it is fixing.
    expect(coveredHeight(844, 100)).toBe(0);
  });

  it('survives a viewport that reports nothing useful', () => {
    expect(coveredHeight(NaN, 500)).toBe(0);
    expect(coveredHeight(844, NaN)).toBe(0);
  });
});
