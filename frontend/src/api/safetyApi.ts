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

export const safetyApi = {
  async report(
    accessToken: string,
    reportedId: string,
    reason: string,
    details: string | undefined,
    reportId: string,
  ) {
    return authFetch("/safety/report", accessToken, {
      method: "POST",
      body: JSON.stringify({ reportedId, reason, details, reportId }),
    });
  },

  async block(accessToken: string, blockedId: string) {
    return authFetch("/safety/block", accessToken, {
      method: "POST",
      body: JSON.stringify({ blockedId }),
    });
  },

  async unblock(accessToken: string, blockedId: string) {
    return authFetch("/safety/unblock", accessToken, {
      method: "POST",
      body: JSON.stringify({ blockedId }),
    });
  },

  async getBlockStatus(accessToken: string, targetId: string): Promise<boolean> {
    const result = await authFetch(`/safety/block-status?targetId=${encodeURIComponent(targetId)}`, accessToken);
    return !!(result.data as { blocked?: boolean } | undefined)?.blocked;
  },

  async unmatch(accessToken: string, targetId: string) {
    return authFetch("/safety/unmatch", accessToken, {
      method: "POST",
      body: JSON.stringify({ targetId }),
    });
  },
};