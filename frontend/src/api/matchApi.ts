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

/** What a member can send right now. Decided on the server, never the phone. */
export type SparkWallet = {
  freeSparkAvailable: boolean;
  /** Extra Sparks earned from the Daily Question. */
  sparks: number;
  /** Super Likes bought in packs. */
  superlikes: number;
};

export type SparkKind = "spark" | "superlike";

export const matchApi = {
  async sparkWallet(accessToken: string): Promise<SparkWallet> {
    const data = await authFetch("/matches/sparks", accessToken);
    return data.wallet as SparkWallet;
  },

  /** Send a Spark (free) or a Super Like (paid). It likes them as well. */
  async sendSpark(
    accessToken: string,
    input: { targetId: string; kind: SparkKind; note?: string },
  ): Promise<{ ok: true; kind: SparkKind; mutual: boolean; wallet: SparkWallet }> {
    return authFetch("/matches/spark", accessToken, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

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

  /** The number on the Home bell: likes that came in since it was last opened. */
  async notificationCount(accessToken: string): Promise<number> {
    const data = await authFetch("/matches/notifications", accessToken);
    return Number(data.unread) || 0;
  },

  /** Opening Notifications clears the bell. */
  async markNotificationsSeen(accessToken: string): Promise<void> {
    await authFetch("/matches/notifications/seen", accessToken, { method: "POST" });
  },
};