import * as ScreenCapture from "expo-screen-capture";

/**
 * Screenshot alerts in the phone app: calls back when a screenshot is taken
 * while a chat is open. Android before 14 needs the photos permission to
 * notice one; asked once, only when a chat is opened.
 */
export const screenshotDetection = true;

export function watchScreenshots(onScreenshot: () => void): () => void {
  let subscription: { remove: () => void } | null = null;
  let stopped = false;
  void (async () => {
    try {
      const permission = await ScreenCapture.requestPermissionsAsync().catch(() => null);
      if (stopped || (permission && !permission.granted)) return;
      subscription = ScreenCapture.addScreenshotListener(onScreenshot);
    } catch {
      // This phone cannot report screenshots.
    }
  })();
  return () => {
    stopped = true;
    subscription?.remove();
  };
}
