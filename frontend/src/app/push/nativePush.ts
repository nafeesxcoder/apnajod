/**
 * Notifications in the phone app. On the website the service worker does
 * this (see MilaanApp), so here there is nothing to do.
 */
import { type PushTargets } from "./pushTarget";

export { pushTarget, type PushTargets } from "./pushTarget";

export function startNativePush(_accessToken: string, _targets: PushTargets): () => void {
  return () => undefined;
}

export async function forgetNativePush(_accessToken: string): Promise<void> {
  // Nothing on the web.
}
