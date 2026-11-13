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

export type DailyQuestion = {
  id: number;
  text: string;
  options: string[];
};

export type DailyQuestionToday = {
  question: DailyQuestion | null;
  /** They have answered today (maybe a different question, if the rotation changed). */
  answered: boolean;
  /** Their answer to this question, if they gave one. */
  answer: string | null;
  /** Sparks paid for answering. */
  reward: number;
  /** How many members answered today's question so far. */
  answeredToday?: number;
};

export const dailyQuestionApi = {
  async today(accessToken: string): Promise<DailyQuestionToday> {
    return authFetch("/daily-question", accessToken);
  },
  async answer(accessToken: string, questionId: number, answer: string) {
    return authFetch("/daily-question/answer", accessToken, {
      method: "POST",
      body: JSON.stringify({ questionId, answer }),
    }) as Promise<{ ok: true; answer: string; reward: number }>;
  },
};
