import { API_URL } from "./config";
import type { StoryMusic } from "./musicApi";

export type StoryItem = {
  id: string;
  mediaUrl: string;
  createdAt: string;
  expiresAt: string;
  /** The song clip it plays, if any (at most 30 seconds). */
  music?: StoryMusic | null;
  /** Poll, question and @mention stickers, live on top of the photo. */
  stickers?: StorySticker[];
};

type Placed = { id: string; x: number; y: number; scale: number; rotation: number };
export type StorySticker =
  | (Placed & { kind: "poll"; question: string; options: [string, string]; counts?: [number, number]; myVote?: number | null })
  | (Placed & { kind: "question"; prompt: string })
  | (Placed & { kind: "mention"; userId: string; username: string });

/** For the story's owner: who voted what, and the answers. */
export type StoryResponses = {
  votes: { stickerId: string; choice: number; at: string; user: StoryPerson["user"] }[];
  answers: { id: string; stickerId: string; body: string; at: string; user: StoryPerson["user"] }[];
};
export type StoryPerson = {
  user: { userId: string; username: string; name: string; avatarUrl: string | null };
  mine: boolean;
  stories: StoryItem[];
};

async function authFetch(path: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

/**
 * Stories: a photo for 24 hours. The server deletes the photo and its row
 * when the time is up; nothing about who saw it is sent there.
 */
export const storyApi = {
  async tray(accessToken: string): Promise<StoryPerson[]> {
    const data = await authFetch("/stories", accessToken);
    return (data.people as StoryPerson[]) || [];
  },

  /** Uploads the photo as picked - full quality, no resizing. */
  async create(
    accessToken: string,
    uri: string,
    music?: StoryMusic | null,
    stickers: StorySticker[] = [],
  ): Promise<{ id: string; mediaUrl: string }> {
    const body = new FormData();
    const file = await fetch(uri).then((response) => response.blob());
    body.append("photo", file, "story.jpg");
    // Only which song, where and how long - no sound file.
    if (music) {
      body.append("musicTrackId", music.trackId);
      body.append("musicStart", String(Math.floor(music.start)));
      body.append("musicLength", String(music.length));
    }
    // Poll, question and @mention stickers: shown live on top of the photo.
    if (stickers.length) body.append("stickers", JSON.stringify(stickers));
    const response = await fetch(`${API_URL}/stories`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.story) {
      throw new Error(
        response.status === 413
          ? "That photo is too big for a story."
          : data.error || "Your story could not be shared.",
      );
    }
    return data.story;
  },

  async vote(accessToken: string, storyId: string, stickerId: string, choice: 0 | 1): Promise<{ counts: [number, number]; myVote: number }> {
    return authFetch(`/stories/${storyId}/vote`, accessToken, { method: "POST", body: JSON.stringify({ stickerId, choice }) });
  },

  async answer(accessToken: string, storyId: string, stickerId: string, body: string) {
    return authFetch(`/stories/${storyId}/answer`, accessToken, { method: "POST", body: JSON.stringify({ stickerId, body }) });
  },

  async responses(accessToken: string, storyId: string): Promise<StoryResponses> {
    const data = await authFetch(`/stories/${storyId}/responses`, accessToken);
    return { votes: data.votes || [], answers: data.answers || [] };
  },

  async remove(accessToken: string, storyId: string) {
    return authFetch(`/stories/${storyId}`, accessToken, { method: "DELETE" });
  },
};
