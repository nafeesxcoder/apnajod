/**
 * Where a tapped notification takes you, and the places the app can open.
 * Kept in its own file: the phone and web push files both use it, and the
 * phone file must not import itself (on a phone "./nativePush" resolves to
 * the phone file, which made pushTarget call itself until the stack broke).
 */
export type PushTargets = {
  onOpenChat: (conversationId: string) => void;
  onOpenPost: (postId: string) => void;
  /** A story like, mention or close-friends story: play that person's stories. */
  onOpenStory?: (userId: string) => void;
  /** A Ludo invite: open that game room. */
  onOpenLudo?: (gameId: string) => void;
};

/** Where a tapped notification should take you. */
export function pushTarget(data: unknown): { chat?: string; post?: string; story?: string; ludo?: string } {
  const value = (data ?? {}) as { conversationId?: unknown; postId?: unknown; storyUserId?: unknown; ludoGameId?: unknown };
  if (value.conversationId) return { chat: String(value.conversationId) };
  if (value.postId) return { post: String(value.postId) };
  if (value.storyUserId) return { story: String(value.storyUserId) };
  if (value.ludoGameId) return { ludo: String(value.ludoGameId) };
  return {};
}
