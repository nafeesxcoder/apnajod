import type { ConversationSummary } from "../../api/chatApi";

/** Archived chats (until a new message brings them back). */
export function archivedCount(items: Pick<ConversationSummary, "archived">[]): number {
  return items.filter((c) => c.archived).length;
}

/** Your chats: pinned first, then newest. Archived ones only in their folder. */
export function listOrder<T extends Pick<ConversationSummary, "archived" | "pinned" | "lastAt">>(items: T[], archived: boolean): T[] {
  const shown = items.filter((c) => !!c.archived === archived);
  return [...shown].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.lastAt - a.lastAt);
}
