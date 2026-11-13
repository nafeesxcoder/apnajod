import { API_URL } from "./config";

export type StoryItem = { id: string; mediaUrl: string; createdAt: string; expiresAt: string };
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
  async create(accessToken: string, uri: string): Promise<{ id: string; mediaUrl: string }> {
    const body = new FormData();
    const file = await fetch(uri).then((response) => response.blob());
    body.append("photo", file, "story.jpg");
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

  async remove(accessToken: string, storyId: string) {
    return authFetch(`/stories/${storyId}`, accessToken, { method: "DELETE" });
  },
};
