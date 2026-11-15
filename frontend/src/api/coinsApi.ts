import { API_URL } from "./config";

async function authFetch(path: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export type StoreItem = { key: string; kind: "theme" | "sound" | "dice" | "token" | "emoji" | "chat"; name: string; price: number; items?: string[] };

export type GameWallet = {
  coins: number;
  xp: number;
  level: string;
  levelFrom: number;
  nextLevel: string | null;
  nextAt: number | null;
  wins: number;
  games: number;
  streak: number;
  bestStreak: number;
  unlocked: string[];
  canSpin: boolean;
  spinReadyAt: string;
  catalog: StoreItem[];
  exchange: Record<string, { coins: number; label: string }>;
  spinSlices: string[];
  /** After a swap: what you got ("1 Spark"). */
  got?: string;
};

export type SpinPrize = { kind: "coins"; amount: number } | { kind: "credit"; credit: string; label: string } | { kind: "unlock"; key: string; name: string; itemKind: string };

export type LeaderRow = { rank: number; userId: string; name: string; photo: string | null; coins: number; me: boolean };

export const coinsApi = {
  wallet: async (token: string): Promise<GameWallet> => (await authFetch("/games/wallet", token)).wallet,
  unlock: async (token: string, key: string): Promise<GameWallet> =>
    (await authFetch("/games/unlock", token, { method: "POST", body: JSON.stringify({ key }) })).wallet,
  exchange: async (token: string, what: string): Promise<GameWallet> =>
    (await authFetch("/games/exchange", token, { method: "POST", body: JSON.stringify({ what }) })).wallet,
  spin: async (token: string): Promise<{ slice: number; prize: SpinPrize; wallet: GameWallet }> => authFetch("/games/spin", token, { method: "POST" }),
  leaderboard: async (token: string): Promise<LeaderRow[]> => (await authFetch("/games/leaderboard", token)).players || [],
};
