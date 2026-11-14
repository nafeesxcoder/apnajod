/**
 * Screenshot alerts. A browser cannot tell when a screenshot is taken, so
 * on the website there is nothing to watch (the setting is hidden there).
 */
export const screenshotDetection = false;

export function watchScreenshots(_onScreenshot: () => void): () => void {
  return () => undefined;
}
