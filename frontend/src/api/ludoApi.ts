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

export type LudoMember = {
  userId: string;
  name: string;
  photo: string | null;
  status: "invited" | "joined" | "left" | "declined";
  seat: number | null;
  color: string | null;
};

export type LudoPlayer = {
  userId: string;
  seat: number;
  color: string;
  tokens: number[];
  place: number | null;
  out: boolean;
};

export type LudoLast =
  | { type: "roll" | "no_move" | "three_sixes"; userId: string; dice: number }
  | { type: "move"; userId: string; token: number; from: number; to: number; dice: number; cut: { userId: string; token: number }[] }
  | { type: "left"; userId: string };

export type LudoGame = {
  id: string;
  hostId: string;
  isHost: boolean;
  maxPlayers: number;
  status: "waiting" | "playing" | "finished" | "cancelled";
  version: number;
  turnDeadline: string | null;
  turnSeconds: number;
  members: LudoMember[];
  state: {
    players: LudoPlayer[];
    turnUserId: string | null;
    dice: number | null;
    rolled: boolean;
    movable: number[];
    last: LudoLast | null;
    places: string[];
    winner: string | null;
    finished: boolean;
    moveNo: number;
    /** Coins each player earned when the game ended. */
    rewards?: Record<string, { coins: number; place: number; notes?: string[]; capped?: boolean }> | null;
  } | null;
};

const post = (accessToken: string, path: string, body?: unknown) =>
  authFetch(path, accessToken, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const ludoApi = {
  async mine(accessToken: string): Promise<LudoGame[]> {
    return (await authFetch("/ludo", accessToken)).games ?? [];
  },
  async create(accessToken: string, maxPlayers: number, invite: string[]): Promise<LudoGame> {
    return (await post(accessToken, "/ludo", { maxPlayers, invite })).game;
  },
  async get(accessToken: string, id: string): Promise<LudoGame> {
    return (await authFetch(`/ludo/${id}`, accessToken)).game;
  },
  async invite(accessToken: string, id: string, userIds: string[]): Promise<LudoGame> {
    return (await post(accessToken, `/ludo/${id}/invite`, { userIds })).game;
  },
  async join(accessToken: string, id: string): Promise<LudoGame> {
    return (await post(accessToken, `/ludo/${id}/join`)).game;
  },
  async decline(accessToken: string, id: string) {
    return post(accessToken, `/ludo/${id}/decline`);
  },
  async start(accessToken: string, id: string): Promise<LudoGame> {
    return (await post(accessToken, `/ludo/${id}/start`)).game;
  },
  async roll(accessToken: string, id: string): Promise<LudoGame> {
    return (await post(accessToken, `/ludo/${id}/roll`)).game;
  },
  async move(accessToken: string, id: string, token: number): Promise<LudoGame> {
    return (await post(accessToken, `/ludo/${id}/move`, { token })).game;
  },
  async leave(accessToken: string, id: string) {
    return post(accessToken, `/ludo/${id}/leave`);
  },
};
