/**
 * How much of the window the on-screen keyboard is covering.
 *
 * React Native's KeyboardAvoidingView takes no behaviour on the web, so on
 * a phone browser it does nothing at all. The composer and the emoji / GIF
 * panel sit at the bottom of the screen, so tapping the search field
 * opened the keyboard straight over the thing being typed into: the field
 * was there, and you could not see it or what you were writing.
 *
 * The browser reports this through visualViewport. The arithmetic is here,
 * with no react-native import, so it can be tested - importing
 * react-native into a test fails on its Flow syntax.
 */

/**
 * The height hidden behind the keyboard.
 *
 * `offsetTop` matters: when the page is scrolled within the visual
 * viewport, part of the difference is scroll rather than keyboard, and
 * ignoring it leaves a gap above the keyboard that grows as you scroll.
 */
export function coveredHeight(
  windowHeight: number,
  viewportHeight: number,
  offsetTop = 0,
): number {
  if (!Number.isFinite(windowHeight) || !Number.isFinite(viewportHeight)) {
    return 0;
  }
  const covered = windowHeight - viewportHeight - (offsetTop || 0);
  // Browsers report a few pixels of difference with no keyboard open, and
  // a toolbar sliding away can make this briefly negative.
  if (!Number.isFinite(covered) || covered < 60) return 0;
  // A keyboard taller than the window is a measurement gone wrong, and
  // padding by it would push the composer off the top of the screen.
  if (covered > windowHeight * 0.75) return 0;
  return Math.round(covered);
}
