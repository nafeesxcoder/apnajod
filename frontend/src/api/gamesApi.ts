import { API_URL } from "./config";

export type GameKind = "this_or_that" | "would_you_rather" | "know_me" | "tic_tac_toe";

/** A game as one player is allowed to see it. Fields depend on the kind. */
export type GameView = {
  id: string;
  kind: GameKind;
  title: string;
  emoji: string;
  status: "active" | "done";
  startedByMe: boolean;
  version: number;
  // this_or_that / would_you_rather
  pairs?: [string, string][];
  myPicks?: number[] | null;
  partnerDone?: boolean;
  partnerPicks?: number[] | null;
  matches?: number | null;
  // know_me
  role?: "subject" | "guesser";
  questions?: { q: string; options: string[] }[];
  truth?: number[] | null;
  guesses?: number[] | null;
  score?: number | null;
  // tic_tac_toe
  board?: (null | "X" | "O")[];
  mySymbol?: "X" | "O";
  yourTurn?: boolean;
  winner?: null | "X" | "O" | "draw";
  youWon?: boolean;
  line?: number[] | null;
};

export type KnowMeQuestion = { index: number; q: string; options: string[] };

async function call(path: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Something went wrong. Try again.");
  return body;
}

export const gamesApi = {
  async start(
    accessToken: string,
    peerId: string,
    kind: GameKind,
    setup?: { questions: number[]; answers: number[] },
  ): Promise<GameView> {
    const body = await call(`/chat/${encodeURIComponent(peerId)}/games`, accessToken, {
      method: "POST",
      body: JSON.stringify({ kind, setup }),
    });
    return body.game;
  },
  async get(accessToken: string, gameId: string): Promise<GameView> {
    const body = await call(`/chat/games/${encodeURIComponent(gameId)}`, accessToken);
    return body.game;
  },
  async play(
    accessToken: string,
    gameId: string,
    move: { picks?: number[]; guesses?: number[]; cell?: number },
  ): Promise<GameView> {
    const body = await call(`/chat/games/${encodeURIComponent(gameId)}/move`, accessToken, {
      method: "POST",
      body: JSON.stringify({ move }),
    });
    return body.game;
  },
  async knowMeQuestions(accessToken: string): Promise<KnowMeQuestion[]> {
    const body = await call("/chat/games/know-me-questions", accessToken);
    return body.questions ?? [];
  },
};
