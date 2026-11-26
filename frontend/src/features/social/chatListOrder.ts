import type { ConversationSummary } from "../../api/chatApi";

/** Archived chats (until a new message brings them back). */
export function archivedCount(items: Pick<ConversationSummary, "archived">[]): number {
  return items.filter((c) => c.archived).length;
}

/**
 * Archived right now? A message newer than the archive brings the chat back, the same
 * rule the server uses for the list. The newest message decides.
 */
export function isArchivedNow(
  settings: { conversationArchived?: boolean; archivedAt?: number } | null | undefined,
  messages: { createdAt: number; deletedForEveryone?: boolean }[],
): boolean {
  if (!settings?.conversationArchived) return false;
  const archivedAt = Number(settings.archivedAt) || 0;
  if (!archivedAt) return true;
  let lastAt = 0;
  for (const message of messages) {
    if (!message.deletedForEveryone && message.createdAt > lastAt) lastAt = message.createdAt;
  }
  return lastAt <= archivedAt;
}

/** Your chats: pinned first, then newest. Archived ones only in their folder. */
export function listOrder<T extends Pick<ConversationSummary, "archived" | "pinned" | "lastAt">>(items: T[], archived: boolean): T[] {
  const shown = items.filter((c) => !!c.archived === archived);
  return [...shown].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.lastAt - a.lastAt);
}
