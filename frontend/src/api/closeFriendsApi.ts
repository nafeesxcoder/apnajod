import { API_URL } from "./config";

export type CloseFriendPerson = {
  user: { userId: string; username: string; name: string; avatarUrl: string | null };
  /** On your Close friends list. */
  closeFriend: boolean;
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
 * Close friends: the people who see the stories you share to Close friends.
 * You pick from your matches and people you follow or who follow you.
 */
export const closeFriendsApi = {
  async list(accessToken: string): Promise<CloseFriendPerson[]> {
    const data = await authFetch("/close-friends", accessToken);
    return (data.people as CloseFriendPerson[]) || [];
  },

  async set(accessToken: string, userId: string, close: boolean): Promise<void> {
    await authFetch(`/close-friends/${encodeURIComponent(userId)}`, accessToken, {
      method: "PUT",
      body: JSON.stringify({ close }),
    });
  },
};
