import type { ChatMessage, CoupleChatSettings, DatePlanStatus } from "../storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export type PersistenceResult<T = unknown> = {
  saved: boolean;
  reason: "backend" | "preview_id" | "demo" | "error";
  data?: T;
  error?: string;
};

async function authFetch(path: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    return { saved: false, reason: "error", error: data.error || "Request failed" } as PersistenceResult;
  }
  return { saved: !!data.saved, reason: data.reason || "backend", data: data.data } as PersistenceResult;
}

export type ConversationSummary = {
  /** The other person's id, which is how every chat route addresses a thread. */
  conversationId: string;
  user: {
    userId: string;
    username: string;
    name: string;
    avatarUrl: string | null;
    isPrivate: boolean;
  };
  lastMessage: ChatMessage | null;
  lastAt: number;
  unread: number;
};

export const chatApi = {
  /**
   * Every thread the member has, most recent first.
   *
   * This route answers { ok, conversations } rather than the { data } envelope
   * the message routes use, so it is read directly instead of through
   * authFetch — which would hand back an empty list and an empty Chats tab.
   */
  async fetchConversations(accessToken: string): Promise<ConversationSummary[]> {
    const response = await fetch(`${API_URL}/chat/conversations`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load your chats.");
    return (body.conversations as ConversationSummary[]) || [];
  },

  async fetchMessages(accessToken: string, conversationId: string): Promise<ChatMessage[]> {
    const result = await authFetch(`/chat/${conversationId}/messages`, accessToken);
    return (result.data as ChatMessage[]) || [];
  },

  async fetchMessagesSince(
    accessToken: string,
    conversationId: string,
    sinceMs: number,
  ): Promise<ChatMessage[]> {
    const result = await authFetch(
      `/chat/${conversationId}/messages?since=${sinceMs}`,
      accessToken,
    );
    return (result.data as ChatMessage[]) || [];
  },

  async sendMessage(
    accessToken: string,
    conversationId: string,
    message: ChatMessage,
  ): Promise<PersistenceResult<ChatMessage>> {
    return authFetch(`/chat/${conversationId}/messages`, accessToken, {
      method: "POST",
      body: JSON.stringify(message),
    }) as Promise<PersistenceResult<ChatMessage>>;
  },

  async sendDateProposal(
    accessToken: string,
    conversationId: string,
    date: NonNullable<ChatMessage["date"]>,
  ): Promise<PersistenceResult<{ id: string; status: string }>> {
    return authFetch(`/chat/${conversationId}/date-proposal`, accessToken, {
      method: "POST",
      body: JSON.stringify(date),
    }) as Promise<PersistenceResult<{ id: string; status: string }>>;
  },

  async setDatePlanStatus(
    accessToken: string,
    proposalId: string | undefined,
    status: DatePlanStatus,
  ): Promise<PersistenceResult<{ id: string; status: string }>> {
    return authFetch(`/chat/date-proposal/status`, accessToken, {
      method: "PUT",
      body: JSON.stringify({ proposalId, status }),
    }) as Promise<PersistenceResult<{ id: string; status: string }>>;
  },

  async shareLiveLocation(
    accessToken: string,
    conversationId: string,
    location: NonNullable<ChatMessage["location"]>,
    clientActionId: string,
  ): Promise<PersistenceResult<{ ok: boolean }>> {
    return authFetch(`/chat/${conversationId}/location`, accessToken, {
      method: "POST",
      body: JSON.stringify({ location, clientActionId }),
    }) as Promise<PersistenceResult<{ ok: boolean }>>;
  },

  async editMessage(
    accessToken: string,
    conversationId: string,
    messageId: string,
    text: string,
  ): Promise<PersistenceResult<ChatMessage>> {
    return authFetch(`/chat/${conversationId}/messages/${messageId}`, accessToken, {
      method: "PUT",
      body: JSON.stringify({ text }),
    }) as Promise<PersistenceResult<ChatMessage>>;
  },

  async deleteMessage(
    accessToken: string,
    conversationId: string,
    messageId: string,
  ): Promise<PersistenceResult<ChatMessage>> {
    return authFetch(`/chat/${conversationId}/messages/${messageId}`, accessToken, {
      method: "DELETE",
    }) as Promise<PersistenceResult<ChatMessage>>;
  },

  async setMessageState(
    accessToken: string,
    conversationId: string,
    messageId: string,
    input: { starred?: boolean; pinned?: boolean; hidden?: boolean; reaction?: string | null },
  ): Promise<PersistenceResult<{ ok: boolean }>> {
    return authFetch(`/chat/${conversationId}/messages/${messageId}/state`, accessToken, {
      method: "PUT",
      body: JSON.stringify(input),
    }) as Promise<PersistenceResult<{ ok: boolean }>>;
  },

  async getPresence(
    accessToken: string,
    conversationId: string,
  ): Promise<{ online: boolean; lastActiveAt: string | null; typing: boolean }> {
    const result = await authFetch(`/chat/${conversationId}/presence`, accessToken);
    const data = result.data as
      | { online?: boolean; lastActiveAt?: string | null; typing?: boolean }
      | undefined;
    return {
      online: !!data?.online,
      lastActiveAt: data?.lastActiveAt ?? null,
      typing: !!data?.typing,
    };
  },

  async setTyping(
    accessToken: string,
    conversationId: string,
    typing: boolean,
  ): Promise<void> {
    await authFetch(`/chat/${conversationId}/typing`, accessToken, {
      method: "POST",
      body: JSON.stringify({ typing }),
    });
  },

  async getSettings(
    accessToken: string,
    conversationId: string,
  ): Promise<CoupleChatSettings | null> {
    const result = await authFetch(`/chat/${conversationId}/settings`, accessToken);
    return (result.data as CoupleChatSettings | null) ?? null;
  },

  async saveSettings(
    accessToken: string,
    conversationId: string,
    settings: CoupleChatSettings,
  ): Promise<PersistenceResult<{ ok: boolean }>> {
    return authFetch(`/chat/${conversationId}/settings`, accessToken, {
      method: "PUT",
      body: JSON.stringify(settings),
    }) as Promise<PersistenceResult<{ ok: boolean }>>;
  },

  async uploadMedia(
    accessToken: string,
    localUri: string,
    fileName: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const response = await fetch(localUri, { signal });
    const blob = await response.blob();
    const formData = new FormData();
    formData.append("file", blob, fileName);
    const uploadResponse = await fetch(`${API_URL}/chat/upload`, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
    const data = await uploadResponse.json();
    if (!uploadResponse.ok) {
      throw new Error(data.error || "Could not upload the file.");
    }
    return data.url as string;
  },
};