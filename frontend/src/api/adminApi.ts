import { API_URL } from "./config";
import { authApi } from "./authApi";

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
  if (!response.ok) throw new Error(data.error || "Admin request failed");
  return data;
}

// Public fetch (bina token ke) - Login, Forgot Password ke liye
async function publicFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export type GrowthDays = 7 | 14 | 30;

export type GrowthSeriesKey =
  | "active"
  | "signups"
  | "likes"
  | "matches"
  | "messages"
  | "sparks"
  | "games"
  | "invites"
  | "payments"
  | "revenuePaise"
  | "dailyQuestion";

export type Growth = {
  /** India days, oldest first, ending today ("YYYY-MM-DD"). */
  days: string[];
  series: Record<GrowthSeriesKey, number[]>;
  today: { active: number; signups: number; matches: number; messages: number; revenuePaise: number };
  active: { today: number; last7Days: number; last30Days: number };
  funnel: { members: number; withProfile: number; withPhoto: number; verified: number; paidEver: number };
  plans: { plus: number; pro: number };
  /** First day daily-active counting has data for, or null. */
  activeTrackingSince: string | null;
};

export const adminApi = {
  login: async (identifier: string, password: string) => {
    const session = await authApi.login({ identifier, password });
    
    // Check agar user admin hai
    if (session.user.role !== "admin") {
      throw new Error("Access denied. You are not an admin.");
    }
    return session;
  },

  // 👇 Ye 2 naye functions Forgot/Reset Password ke liye hain
  forgotPassword: (phone: string) => 
    publicFetch("/admin/forgot-password", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  resetPassword: (phone: string, code: string, newPassword: string) => 
    publicFetch("/admin/reset-password", {
      method: "POST",
      body: JSON.stringify({ phone, code, newPassword }),
    }),

  // 👇 Ye dashboard se password change karne ke liye hai
  updatePassword: (token: string, currentPassword: string, newPassword: string) => 
    authFetch("/admin/update-password", token, { 
      method: "PUT", 
      body: JSON.stringify({ currentPassword, newPassword }) 
    }),

  // Baaki admin APIs
  stats: (token: string) => authFetch("/admin/stats", token),
  /** Growth page: one number per India day for the last 7, 14 or 30 days. */
  growth: (token: string, days: GrowthDays): Promise<{ ok: boolean; growth: Growth }> =>
    authFetch(`/admin/growth?days=${days}`, token),
  /** Members, newest first; filter: all, verified, bluetick, pro, paid or pending. */
  users: (token: string, q = "", filter = "all") =>
    authFetch(`/admin/users?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}`, token),
  verifications: (token: string) => authFetch("/admin/verifications", token),
  approveVerification: (token: string, id: string) => authFetch(`/admin/verifications/${id}/approve`, token, { method: "POST" }),
  rejectVerification: (token: string, id: string) => authFetch(`/admin/verifications/${id}/reject`, token, { method: "POST" }),
  reports: (token: string) => authFetch("/admin/reports", token),
  appeals: (token: string) => authFetch("/admin/appeals", token),
  dailyQuestions: (token: string) => authFetch("/admin/questions", token),
  // Story music library.
  musicList: (token: string) => authFetch("/admin/music", token),
  musicDelete: (token: string, id: string) => authFetch(`/admin/music/${id}`, token, { method: "DELETE" }),
  /** Saves a song's length when the upload could not read it. */
  musicDuration: (token: string, id: string, durationSec: number) =>
    authFetch(`/admin/music/${id}/duration`, token, { method: "POST", body: JSON.stringify({ durationSec }) }),
  musicAdd: async (token: string, file: Blob, fileName: string, title: string, artist: string, durationSec: number) => {
    const body = new FormData();
    body.append("title", title);
    body.append("artist", artist);
    body.append("durationSec", String(Math.round(durationSec || 0)));
    body.append("audio", file, fileName);
    const response = await fetch(`${API_URL}/admin/music`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(response.status === 413 ? "That file is too big (10 MB at most)." : data.error || "Could not add the song");
    return data;
  },
  createDailyQuestion: (token: string, question: string, options: string[]) => authFetch("/admin/questions", token, { method: "POST", body: JSON.stringify({ question, options }) }),
  setDailyQuestionActive: (token: string, id: number, active: boolean) => authFetch(`/admin/questions/${id}/active`, token, { method: "POST", body: JSON.stringify({ active }) }),
  // Coupons the admin writes, and the offer popup.
  coupons: (token: string) => authFetch("/admin/coupons", token),
  createCoupon: (
    token: string,
    body: { code: string; percent: number; validUntil?: string | null; maxUses?: number | null; showAtCheckout?: boolean },
  ) => authFetch("/admin/coupons", token, { method: "POST", body: JSON.stringify(body) }),
  updateCoupon: (token: string, id: string, body: { active?: boolean; showAtCheckout?: boolean }) =>
    authFetch(`/admin/coupons/${id}`, token, { method: "POST", body: JSON.stringify(body) }),
  promo: (token: string) => authFetch("/admin/promo", token),
  publishPromo: (
    token: string,
    body: {
      headline: string;
      title?: string;
      message?: string;
      buttonLabel?: string;
      couponCode?: string | null;
      style: string;
      endsAt?: string | null;
    },
  ) => authFetch("/admin/promo", token, { method: "POST", body: JSON.stringify(body) }),
  stopPromo: (token: string) => authFetch("/admin/promo/off", token, { method: "POST" }),

  // Festival themes on the whole app.
  festivals: (token: string) => authFetch("/admin/festivals", token),
  scheduleFestival: (
    token: string,
    body: {
      themeKey: string;
      greeting?: string;
      startsAt?: string | null;
      endsAt?: string | null;
      offerPercent?: number | null;
    },
  ) => authFetch("/admin/festivals", token, { method: "POST", body: JSON.stringify(body) }),
  stopFestival: (token: string) => authFetch("/admin/festivals/stop", token, { method: "POST" }),
  pushFestival: (token: string, message: string) =>
    authFetch("/admin/festivals/push", token, { method: "POST", body: JSON.stringify({ message }) }),
  cancelFestival: (token: string, id: string) =>
    authFetch(`/admin/festivals/${id}/cancel`, token, { method: "POST" }),
  // UPI payments waiting to be checked against the bank app.
  payments: (token: string) => authFetch("/admin/payments", token),
  approvePayment: (token: string, id: string) =>
    authFetch(`/admin/payments/${id}/approve`, token, { method: "POST" }),
  rejectPayment: (token: string, id: string, reason: string) =>
    authFetch(`/admin/payments/${id}/reject`, token, { method: "POST", body: JSON.stringify({ reason }) }),
  resolveAppeal: (token: string, id: string, action: "restore" | "reject") => authFetch(`/admin/appeals/${id}/resolve`, token, { method: "POST", body: JSON.stringify({ action }) }),
  // A reported post: remove it (its owner is told why), or keep it.
  removePost: (token: string, postId: string) => authFetch(`/admin/posts/${postId}/remove`, token, { method: "POST" }),
  keepPost: (token: string, postId: string) => authFetch(`/admin/posts/${postId}/keep`, token, { method: "POST" }),
  resolveReport: (token: string, id: string, action: "actioned" | "dismissed") => authFetch(`/admin/reports/${id}/resolve`, token, { method: "POST", body: JSON.stringify({ action }) }),
  setUserRole: (token: string, id: string, role: "user" | "admin") => authFetch(`/admin/users/${id}/role`, token, { method: "POST", body: JSON.stringify({ role }) }),
  banUser: (token: string, id: string) => authFetch(`/admin/users/${id}/ban`, token, { method: "POST" }),
  unbanUser: (token: string, id: string) => authFetch(`/admin/users/${id}/unban`, token, { method: "POST" }),
};