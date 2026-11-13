import { chatApi, type ConversationSummary } from "../../api/chatApi";
import { matchApi, type MutualMatchSummary } from "../../api/matchApi";

/**
 * Everyone you can message: your chats, plus matches you have not written
 * to yet (they sit in Chats too, waiting for a first message). Used by the
 * Chats tab and by "Send in chat" when sharing a post - which used to list
 * only people you had already chatted with.
 */
export async function loadChatsAndMatches(token: string): Promise<ConversationSummary[]> {
  const conversations = await chatApi.fetchConversations(token);
  let matches: MutualMatchSummary[] = [];
  try {
    const result = await matchApi.getMatches(token);
    matches = (result.matches as MutualMatchSummary[]) || [];
  } catch {
    // A match list that will not load must not empty the chat list.
    return conversations;
  }
  const alreadyListed = new Set(conversations.map((c) => c.conversationId));
  const waiting: ConversationSummary[] = matches
    .filter((match) => !alreadyListed.has(match.id))
    .map((match) => ({
      conversationId: match.id,
      user: {
        userId: match.id,
        username: match.username ?? "",
        name: match.name,
        avatarUrl: match.photo || null,
        isPrivate: false,
      },
      lastMessage: null,
      lastAt: new Date(match.matchedAt ?? Date.now()).getTime(),
      unread: 0,
    }));
  return [...waiting, ...conversations].sort((a, b) => b.lastAt - a.lastAt);
}
