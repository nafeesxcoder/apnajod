import {
  parseCoupleConnectionHub,
  parseCoupleConnectionRequest,
  parseCouplePartnerSummary,
  isCoupleSearchMiss,
  parseCoupleContactMatches,
  parseCouplePartnerProfile,
  CoupleSearchMissError,
  type CoupleContactMatch,
  type CouplePartnerProfile,
  type CoupleConnectionHub,
  type CoupleConnectionRequest,
  type CouplePartnerSummary,
} from "../domain/coupleConnection";

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

export const coupleApi = {
  // Accepts either a phone number or an email address — whichever the
  // partner used to search with — and asks the backend for a match on
  // that identifier.
  async searchPartner(accessToken: string, identifier: string): Promise<CouplePartnerSummary> {
    const trimmed = identifier.trim();
    const isEmail = trimmed.includes("@");
    const query = isEmail
      ? `email=${encodeURIComponent(trimmed.toLowerCase())}`
      : `phone=${encodeURIComponent(trimmed)}`;
    const data = await authFetch(`/couple/search?${query}`, accessToken);
    if (isCoupleSearchMiss(data))
      throw new CoupleSearchMissError(
        isEmail
          ? "No member found with that email address."
          : "No member found with that phone number.",
      );
    return parseCouplePartnerSummary(data);
  },

  // Sends the phone numbers from the member's address book and gets back
  // only the ones that already have a Milaan account.
  async matchContacts(accessToken: string, phones: string[]): Promise<CoupleContactMatch[]> {
    const data = await authFetch("/couple/contacts/match", accessToken, {
      method: "POST",
      body: JSON.stringify({ phones }),
    });
    return parseCoupleContactMatches(data);
  },

  async getPartnerProfile(accessToken: string, connectionId: string): Promise<CouplePartnerProfile> {
    const data = await authFetch(`/couple/partner/${encodeURIComponent(connectionId)}`, accessToken);
    return parseCouplePartnerProfile(data);
  },

  async sendRequest(accessToken: string, memberId: string): Promise<CoupleConnectionRequest> {
    const data = await authFetch("/couple/request", accessToken, {
      method: "POST",
      body: JSON.stringify({ memberId }),
    });
    return parseCoupleConnectionRequest(data);
  },

  async respond(
    accessToken: string,
    requestId: string,
    accept: boolean,
  ): Promise<CoupleConnectionHub> {
    const data = await authFetch("/couple/respond", accessToken, {
      method: "POST",
      body: JSON.stringify({ requestId, accept }),
    });
    return parseCoupleConnectionHub(data);
  },

  async getHub(accessToken: string): Promise<CoupleConnectionHub> {
    const data = await authFetch("/couple/hub", accessToken);
    return parseCoupleConnectionHub(data);
  },

  async setMode(accessToken: string, enabled: boolean) {
    return authFetch("/couple/mode", accessToken, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
  },

  // Omitting connectionId keeps the old behavior of ending whichever
  // connection is most recently active; pass it to end one specific
  // partner connection while keeping any others the member still has.
  async disconnect(accessToken: string, connectionId?: string) {
    return authFetch("/couple/disconnect", accessToken, {
      method: "POST",
      body: JSON.stringify(connectionId ? { connectionId } : {}),
    });
  },
};
