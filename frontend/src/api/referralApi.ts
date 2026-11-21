import { API_URL } from "./config";

async function authFetch(path: string, accessToken: string) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export type ReferralSummary = {
  joined: number;
  boostsEarned: number;
  pending: number;
  monthlyCap: number;
};

export const referralApi = {
  async getSummary(accessToken: string): Promise<ReferralSummary> {
    return authFetch("/referral/summary", accessToken);
  },

  async getInviteLink(accessToken: string): Promise<{ link: string; username: string }> {
    return authFetch("/referral/link", accessToken);
  },
};
