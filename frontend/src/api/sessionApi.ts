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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Something went wrong. Try again.");
  }
  return data;
}

/** One sign-in on one device: where the account is signed in. */
export type SignInDevice = {
  id: string;
  device: string;
  ip: string;
  signedInAt: string | null;
  lastUsedAt: string | null;
  current: boolean;
};

export const sessionApi = {
  /** Every device the account is signed in on, this one first. */
  async list(accessToken: string): Promise<SignInDevice[]> {
    const data = await authFetch("/auth/sessions", accessToken);
    return (data.sessions as SignInDevice[]) || [];
  },

  /** Log one device out. */
  async logout(accessToken: string, id: string): Promise<void> {
    await authFetch(`/auth/sessions/${encodeURIComponent(id)}/logout`, accessToken, { method: "POST" });
  },

  /** Log every device out except this one. */
  async logoutOthers(accessToken: string): Promise<void> {
    await authFetch("/auth/sessions/logout-others", accessToken, { method: "POST" });
  },
};
