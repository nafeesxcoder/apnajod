import { Platform } from "react-native";
import { API_URL } from "./config";

/** The type to send with a file: the picker's type if it gave one, else from the name. */
const TYPES_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

export function mimeTypeFor(fileName: string, picked?: string | null): string {
  if (picked && picked !== "application/octet-stream") return picked;
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return TYPES_BY_EXTENSION[extension] ?? "application/octet-stream";
}
import type { ChatMessage, CoupleChatSettings, DatePlanStatus } from "../storage";

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
  /** Days in a row both people wrote. Shown from 2 days. */
  streak?: ChatStreak;
  /** From your chat settings: pinned to the top. */
  pinned?: boolean;
  /** In Archived until a new message arrives. */
  archived?: boolean;
  /** Notifications off for now. */
  muted?: boolean;
};

/** 🔥 - `atRisk` means it is alive from yesterday but neither has finished today. */
export type ChatStreak = { count: number; atRisk: boolean; show: boolean };

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

  /** "I'm safe" after an accepted date. */
  async dateCheckIn(accessToken: string, proposalId: string): Promise<PersistenceResult> {
    return authFetch(`/chat/date-proposal/checkin`, accessToken, { method: "POST", body: JSON.stringify({ proposalId }) });
  },

  /** A vote on a poll in the chat (can be changed). */
  async votePoll(accessToken: string, conversationId: string, messageId: string, choice: number): Promise<PersistenceResult> {
    return authFetch(`/chat/${conversationId}/messages/${encodeURIComponent(messageId)}/vote`, accessToken, {
      method: "POST",
      body: JSON.stringify({ choice }),
    });
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

  /** Which of these members are online, for the chat list's green dots. */
  async presenceFor(accessToken: string, userIds: string[]): Promise<Record<string, boolean>> {
    if (!userIds.length) return {};
    const result = (await authFetch(`/chat/presence?ids=${encodeURIComponent(userIds.join(","))}`, accessToken)) as {
      data?: { online?: Record<string, boolean> };
    };
    return result.data?.online ?? {};
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

  /** You took a screenshot of this chat: the other person is told (if their alerts are on). */
  async screenshot(accessToken: string, conversationId: string): Promise<void> {
    await authFetch(`/chat/${conversationId}/screenshot`, accessToken, { method: "POST" });
  },

  /** A live location moves to where the sharer is now. Only the sharer may. */
  async updateLiveLocation(
    accessToken: string,
    conversationId: string,
    messageId: string,
    spot: { latitude: number; longitude: number; accuracy?: number },
  ): Promise<void> {
    await authFetch(`/chat/${conversationId}/location/${messageId}/live`, accessToken, {
      method: "POST",
      body: JSON.stringify(spot),
    });
  },

  /** The sharer stops a live location; it ends on both sides. */
  async stopLiveLocation(accessToken: string, conversationId: string, messageId: string): Promise<void> {
    await authFetch(`/chat/${conversationId}/location/${messageId}/stop`, accessToken, { method: "POST" });
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
    pickedMimeType?: string | null,
  ): Promise<string> {
    const type = mimeTypeFor(fileName, pickedMimeType);
    const formData = new FormData();
    if (Platform.OS === "web") {
      const response = await fetch(localUri, { signal });
      const blob = await response.blob();
      // The server reads the type from the file part: give it the real one.
      formData.append("file", blob.type === type ? blob : new Blob([blob], { type }), fileName);
    } else {
      // The phone reads the file itself and sends it with its real type.
      formData.append("file", { uri: localUri, name: fileName, type } as any);
    }
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
/**
 * Opening lines for an empty chat, built on the server from what the two
 * people share. Empty on any failure - a chat must never break over this.
 */
export async function fetchIcebreakers(
  accessToken: string,
  conversationId: string,
): Promise<string[]> {
  try {
    const response = await fetch(
      `${API_URL}/chat/${encodeURIComponent(conversationId)}/icebreakers`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.lines) ? data.lines.filter((line: unknown) => typeof line === "string") : [];
  } catch {
    return [];
  }
}

/** The 🔥 for one open chat. A failed call is simply no streak. */
export async function fetchStreak(
  accessToken: string,
  conversationId: string,
): Promise<ChatStreak | null> {
  try {
    const response = await fetch(
      `${API_URL}/chat/${encodeURIComponent(conversationId)}/streak`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) return null;
    const body = await response.json();
    const data = body?.data;
    return data && typeof data.count === "number" ? (data as ChatStreak) : null;
  } catch {
    return null;
  }
}
