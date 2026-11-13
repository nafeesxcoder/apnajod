/**
 * Notifications in the phone app. On the website the service worker does
 * this (see MilaanApp), so here there is nothing to do.
 */
export type PushTargets = { onOpenChat: (conversationId: string) => void; onOpenPost: (postId: string) => void };

export function startNativePush(_accessToken: string, _targets: PushTargets): () => void {
  return () => undefined;
}

export async function forgetNativePush(_accessToken: string): Promise<void> {
  // Nothing on the web.
}

/** Where a tapped notification should take you. */
export function pushTarget(data: unknown): { chat?: string; post?: string } {
  const value = (data ?? {}) as { conversationId?: unknown; postId?: unknown };
  if (value.conversationId) return { chat: String(value.conversationId) };
  if (value.postId) return { post: String(value.postId) };
  return {};
}
