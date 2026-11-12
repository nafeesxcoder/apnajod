import { API_URL } from "./config";

export type FamilyShareLink = {
  token: string;
  url: string;
  expiresAt: string | null;
  own: boolean;
};

export type SharedProfileView = {
  sharedBy: string;
  own: boolean;
  expiresAt: string | null;
  profile: {
    firstName: string;
    age: number;
    city: string;
    profession: string;
    about: string;
    verified: boolean;
    photos: string[];
    intent: {
      intent?: string;
      timeline?: string;
      children?: string;
      family?: string;
      relocation?: string;
    } | null;
  };
};

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

export const shareApi = {
  /** A 7-day "show my family" link. Leave targetId out for your own profile. */
  async create(accessToken: string, targetId?: string): Promise<FamilyShareLink> {
    const response = await fetch(`${API_URL}/share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(targetId ? { targetId } : {}),
    });
    return readJson(response);
  },

  /** What a family member sees. No login. */
  async view(token: string): Promise<SharedProfileView> {
    const response = await fetch(`${API_URL}/share/${encodeURIComponent(token)}`);
    return readJson(response);
  },
};
