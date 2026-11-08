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

export type RazorpayOrder = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  planCode: string;
  planTitle: string;
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

  async createOrder(
    accessToken: string,
    planCode: string,
  ): Promise<RazorpayOrder> {
    const data = await authFetch("/billing/order", accessToken, {
      method: "POST",
      body: JSON.stringify({ planCode }),
    });
    return {
      orderId: data.orderId,
      amount: data.amount,
      currency: data.currency,
      keyId: data.keyId,
      planCode: data.planCode,
      planTitle: data.planTitle,
    };
  },

  checkoutAvailable: true,
};
