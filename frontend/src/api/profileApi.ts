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
/** The pose a member must show in their verification selfie. */
export type VerificationPose = {
  code: string;
  emoji: string;
  text: string;
  validMinutes: number;
};

/** One of today's five, as the server stored it, plus where it stands now. */
export type DailyPick = Record<string, any> & {
  id: string;
  name: string;
  age: number;
  city: string;
  photo: string;
  verified?: boolean;
  blueTick?: boolean;
  /** "new", or the member's decision: "interested" / "pass". */
  pickStatus: "new" | "interested" | "pass";
};

export type DailyPicks = {
  day: string;
  /** When the next five arrive (9 PM India time), ISO. */
  nextAt: string;
  picks: DailyPick[];
};

export const profileApi = {
  /** Aaj ke 5 - built on the server the first time it is asked for each day. */
  async dailyPicks(accessToken: string): Promise<DailyPicks> {
    return authFetch("/profile/daily-picks", accessToken);
  },
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
      bio?: string;
    },
  ) {
    return authFetch("/profile/profile", accessToken, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },
  /** A fresh random pose. Each call replaces the last one. */
  async verificationPose(accessToken: string): Promise<VerificationPose> {
    const data = await authFetch("/profile/verify/pose", accessToken, {
      method: "POST",
    });
    return data.pose as VerificationPose;
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
