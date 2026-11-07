/**
 * What a member has paid for, and what is for sale.
 *
 * Everything here is for drawing the screen. No gate trusts it: the server
 * checks again when a like is sent or a boost is started, because anything
 * the client decides is decided by whoever opens the console.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

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
};

export type BillingSummary = {
  premium: boolean;
  premiumUntil: string | null;
  likes: { limit: number | null; used: number; remaining: number | null };
  boost: { balance: number; active: { endsAt: string } | null };
};

/** Paise to rupees, because two places rounding separately will disagree. */
export function rupees(paise: number) {
  const whole = Math.round(paise) / 100;
  return `₹${whole % 1 === 0 ? whole.toFixed(0) : whole.toFixed(2)}`;
}

export const billingApi = {
  /** Public: prices can be shown before anyone signs up. */
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
   * Checkout.
   *
   * Nothing to call yet: Razorpay is not connected, and Google Play
   * Billing needs the app listed before it can be. This is the single
   * place that changes when either arrives, so no screen has to learn
   * which rail took the money.
   */
  checkoutAvailable: false,
};
