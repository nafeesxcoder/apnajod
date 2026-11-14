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

export type RazorpayOrder = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  planCode: string;
  planTitle: string;
};

/** A UPI payment the member sent, waiting for (or past) an admin's check. */
export type UpiPayment = {
  id: string;
  planCode: string;
  planTitle: string;
  amountPaise: number;
  utr: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  createdAt: string;
};

export type PayOptions = {
  upi: { enabled: boolean; upiId: string; payeeName: string; approvalHours: number };
  /** Razorpay only once its account is live - never test keys. */
  razorpay: boolean;
  payments: UpiPayment[];
  /** The coupon the admin shows at payment, if this member can still use it. */
  coupon: { code: string; percent: number; validUntil: string | null } | null;
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
    couponCode?: string | null,
  ): Promise<RazorpayOrder> {
    const data = await authFetch("/billing/order", accessToken, {
      method: "POST",
      body: JSON.stringify({ planCode, couponCode: couponCode || undefined }),
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

  async payOptions(accessToken: string): Promise<PayOptions> {
    const data = await authFetch("/billing/pay-options", accessToken);
    return { upi: data.upi, razorpay: !!data.razorpay, payments: data.payments ?? [], coupon: data.coupon ?? null };
  },

  async submitUpi(accessToken: string, planCode: string, utr: string, couponCode?: string | null): Promise<UpiPayment> {
    const data = await authFetch("/billing/upi", accessToken, {
      method: "POST",
      body: JSON.stringify({ planCode, utr, couponCode: couponCode || undefined }),
    });
    return data.payment;
  },

  /** What a plan costs with a coupon (the server decides), or why it cannot be used. */
  async checkCoupon(
    accessToken: string,
    planCode: string,
    code: string,
  ): Promise<{ amountPaise: number; originalPaise: number; couponCode: string | null; percent: number | null }> {
    const data = await authFetch("/billing/coupon", accessToken, {
      method: "POST",
      body: JSON.stringify({ planCode, code }),
    });
    return {
      amountPaise: Number(data.amountPaise),
      originalPaise: Number(data.originalPaise),
      couponCode: data.couponCode ?? null,
      percent: data.percent ?? null,
    };
  },

  checkoutAvailable: true,
};
