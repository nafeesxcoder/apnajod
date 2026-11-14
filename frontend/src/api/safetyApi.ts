import { API_URL } from "./config";

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

export type BlockedPerson = { userId: string; username: string; name: string; avatarUrl: string | null; blockedAt: string };

export const safetyApi = {
  async report(
    accessToken: string,
    reportedId: string,
    reason: string,
    details: string | undefined,
    reportId: string,
    /** When the report is about one post, so a moderator sees that post. */
    postId?: string,
  ) {
    return authFetch("/safety/report", accessToken, {
      method: "POST",
      body: JSON.stringify({ reportedId, reason, details, reportId, postId }),
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

  /** People you blocked, for the list with Unblock. */
  async blocked(accessToken: string): Promise<BlockedPerson[]> {
    const result = await authFetch("/safety/blocked", accessToken);
    return (result.data as BlockedPerson[] | undefined) ?? [];
  },

  /** Safety Center's numbers and the activity-status switch, from the server. */
  async summary(accessToken: string): Promise<{ reports: number; blocked: number; hideActivity: boolean; safeCheckIns?: number } | null> {
    const result = await authFetch("/safety/summary", accessToken);
    return result.saved ? (result.data as { reports: number; blocked: number; hideActivity: boolean; safeCheckIns?: number }) : null;
  },

  /** Hide activity status: nobody sees when you are online or last active (and you do not see theirs). */
  async setHideActivity(accessToken: string, hidden: boolean): Promise<boolean> {
    const result = await authFetch("/safety/activity-status", accessToken, { method: "PUT", body: JSON.stringify({ hidden }) });
    return !!result.saved;
  },

  /** Everything Apnajoda keeps about you, as JSON text. */
  async exportData(accessToken: string): Promise<string> {
    const response = await fetch(`${API_URL}/profile/me/export`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error("Your data could not be prepared. Please try again.");
    return JSON.stringify(await response.json(), null, 2);
  },

  async unmatch(accessToken: string, targetId: string) {
    return authFetch("/safety/unmatch", accessToken, {
      method: "POST",
      body: JSON.stringify({ targetId }),
    });
  },
};