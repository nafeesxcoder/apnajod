const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
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
export const profileApi = {
  async getMyProfile(accessToken: string) {
    return authFetch("/profile/me", accessToken);
  },
  async discoverMatches(accessToken: string, limit = 20) {
    return authFetch(`/profile/discover?limit=${limit}`, accessToken);
  },
  async updateProfile(
    accessToken: string,
    input: {
      firstName?: string;
      gender?: string;
      age?: string | number;
      height?: string;
      city?: string;
      profession?: string;
      religion?: string;
      community?: string;
      about?: string;
    },
  ) {
    return authFetch("/profile/profile", accessToken, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },
  async submitVerification(accessToken: string, selfieUrl: string) {
    return authFetch("/profile/verify", accessToken, {
      method: "POST",
      body: JSON.stringify({ selfieUrl }),
    });
  },
  async updatePhotos(accessToken: string, photos: string[]) {
    return authFetch("/profile/photos", accessToken, {
      method: "PUT",
      body: JSON.stringify({ photos }),
    });
  },
  async updateVibes(accessToken: string, vibes: string[]) {
    return authFetch("/profile/vibes", accessToken, {
      method: "PUT",
      body: JSON.stringify({ vibes }),
    });
  },
  async updateIntent(
    accessToken: string,
    input: { intent?: string; timeline?: string; children?: string; family?: string; relocation?: string },
  ) {
    return authFetch("/profile/intent", accessToken, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },
  async updatePreferences(accessToken: string, input: Record<string, unknown>) {
    return authFetch("/profile/preferences", accessToken, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },
  async updateMode(accessToken: string, mode: "seeking" | "couple") {
    return authFetch("/profile/mode", accessToken, {
      method: "PUT",
      body: JSON.stringify({ mode }),
    });
  },
  async completeOnboarding(accessToken: string) {
    return authFetch("/profile/complete", accessToken, { method: "POST" });
  },
};