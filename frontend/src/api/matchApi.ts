import { API_URL } from "./config";

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
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

/** A mutual match, as GET /matches returns it. */
export type MutualMatchSummary = {
  id: string;
  username?: string;
  name: string;
  age: number;
  city: string;
  photo: string;
  photos: string[];
  matchedAt?: string;
};

export const matchApi = {
  async decide(accessToken: string, targetId: string, decision: "interested" | "pass") {
    return authFetch("/matches/decide", accessToken, {
      method: "POST",
      body: JSON.stringify({ targetId, decision }),
    });
  },

  async getMatches(accessToken: string) {
    return authFetch("/matches", accessToken);
  },

  async getIncomingLikes(accessToken: string) {
    return authFetch("/matches/likes", accessToken);
  },
};