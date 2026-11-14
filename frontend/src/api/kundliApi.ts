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

export type Koota = { key: string; name: string; max: number; score: number; about: string };

export type KundliSide = {
  rashi: string;
  nakshatra: string | null;
  gana: string | null;
  nadi: string | null;
  yoni: string | null;
  manglik: boolean | null;
  name?: string | null;
} | null;

export type KundliMatch = {
  premium: boolean;
  mine: KundliSide;
  theirs: KundliSide;
  result: {
    total: number;
    max: number;
    full: boolean;
    band: { key: string; label: string };
    /** The eight kootas one by one: Premium only (null otherwise). */
    kootas: Koota[] | null;
  } | null;
};

export const kundliApi = {
  /** Save my Rashi / Nakshatra / Manglik, and (Premium) the lowest Gun score to see. */
  save(
    accessToken: string,
    body: { rashi: number | null; nakshatra: number | null; manglik: "yes" | "no" | "unknown" | null; minGun?: number | null },
  ) {
    return authFetch("/profile/kundli", accessToken, { method: "PUT", body: JSON.stringify(body) });
  },

  /** The Gun Milan with one person. */
  async with(accessToken: string, userId: string): Promise<KundliMatch> {
    const data = await authFetch(`/profile/kundli/${encodeURIComponent(userId)}`, accessToken);
    return { premium: !!data.premium, mine: data.mine ?? null, theirs: data.theirs ?? null, result: data.result ?? null };
  },
};
