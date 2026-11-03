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
  return { saved: !!data.saved, reason: data.reason || "backend", data: data.data ?? data } as PersistenceResult;
}

export const pushApi = {
  async getPublicKey(): Promise<string | null> {
    const response = await fetch(`${API_URL}/push/public-key`);
    const data = await response.json();
    return data.publicKey ?? null;
  },

  async subscribe(accessToken: string, subscription: unknown) {
    return authFetch("/push/subscribe", accessToken, {
      method: "POST",
      body: JSON.stringify(subscription),
    });
  },

  async unsubscribe(accessToken: string, endpoint: string) {
    return authFetch("/push/unsubscribe", accessToken, {
      method: "POST",
      body: JSON.stringify({ endpoint }),
    });
  },
};
