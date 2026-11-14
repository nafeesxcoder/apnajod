/**
 * Notifications in the phone app. On the website the service worker does
 * this (see MilaanApp), so here there is nothing to do.
 */
export type PushTargets = {
  onOpenChat: (conversationId: string) => void;
  onOpenPost: (postId: string) => void;
  /** A story like, mention or close-friends story: play that person's stories. */
  onOpenStory?: (userId: string) => void;
};

export function startNativePush(_accessToken: string, _targets: PushTargets): () => void {
  return () => undefined;
}

export async function forgetNativePush(_accessToken: string): Promise<void> {
  // Nothing on the web.
}

/** Where a tapped notification should take you. */
export function pushTarget(data: unknown): { chat?: string; post?: string; story?: string } {
  const value = (data ?? {}) as { conversationId?: unknown; postId?: unknown; storyUserId?: unknown };
  if (value.conversationId) return { chat: String(value.conversationId) };
  if (value.postId) return { post: String(value.postId) };
  if (value.storyUserId) return { story: String(value.storyUserId) };
  return {};
}
