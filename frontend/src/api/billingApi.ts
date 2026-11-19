import { API_URL } from "./config";

async function authFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {},
) {
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

export type BillingPlan = {
  code: string;
  title: string;
  blurb: string | null;
  kind: "subscription" | "consumable";
  grants: string;
  quantity: number;
  amount_paise: number;
  currency: string;
  /** During a festival offer: the old price, the percent off and its end. */
  original_paise?: number;
  offer_percent?: number;
  offer_ends_at?: string | null;
  /** The Google Play product this plan is sold under, when it is on Play. */
  play_product_id?: string | null;
};

export type BillingSummary = {
  premium: boolean;
  premiumUntil: string | null;
  /** An admin approved their selfie. */
  verified?: boolean;
  /** Pro is running (Pro alone carries the blue tick). */
  pro?: boolean;
  /** Approved selfie AND Pro running. */
  blueTick?: boolean;
  likes: { limit: number | null; used: number; remaining: number | null };
  boost: { balance: number; active: { endsAt: string } | null };
  /** Super Likes left - weekly ones from Plus/Pro plus any bought. */
  superlikes?: number;
};

export function rupees(paise: number) {
  const whole = Math.round(paise) / 100;
  return `₹${whole % 1 === 0 ? whole.toFixed(0) : whole.toFixed(2)}`;
}

export const billingApi = {
  async plans(): Promise<BillingPlan[]> {
    const response = await fetch(`${API_URL}/billing/plans`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load plans");
    return data.plans ?? [];
  },

  async me(accessToken: string): Promise<BillingSummary> {
    const data = await authFetch("/billing/me", accessToken);
    return data.billing;
  },

  async startBoost(accessToken: string) {
    return authFetch("/billing/boost", accessToken, { method: "POST" });
  },

  /**
   * Android: send the Google Play purchase token. The server checks it with
   * Google and turns Premium or the boosts on. Resolves granted only when the
   * server says so.
   */
  async verifyPlayPurchase(
    accessToken: string,
    purchase: { productId: string; purchaseToken: string },
  ): Promise<{ granted: boolean }> {
    const data = await authFetch("/billing/play/verify", accessToken, {
      method: "POST",
      body: JSON.stringify(purchase),
    });
    return { granted: !!data.granted };
  },

  /**
   * Android: whether a Google Play subscription is set to renew, when it runs
   * until, and the Play Store page where the member manages it.
   */
  async playSubscriptionStatus(
    accessToken: string,
    productId: string,
  ): Promise<{ known: boolean; autoRenew: boolean; expiresAt: string | null; manageUrl: string }> {
    const data = await authFetch(`/billing/play/status?productId=${encodeURIComponent(productId)}`, accessToken);
    return {
      known: !!data.known,
      autoRenew: !!data.autoRenew,
      expiresAt: data.expiresAt ?? null,
      manageUrl: String(data.manageUrl || ""),
    };
  },
};
