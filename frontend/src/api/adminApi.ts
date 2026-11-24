import { API_URL } from "./config";
import { authApi, type AuthSession } from "./authApi";

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

/** What admin sign-in returns: a session, or the challenge for the second step. */
type AdminLogin =
  | { challenge: { token: string; authenticator: boolean }; session?: undefined }
  | { session: AuthSession; challenge?: undefined };

function requireAdminSession<T extends { user: { role?: string | null } }>(session: T): T {
  if (session.user.role !== "admin") {
    throw new Error("Access denied. You are not an admin.");
  }
  return session;
}

export const adminApi = {
  /**
   * Admin sign-in. Either a session, or (when two-step verification is on) a
   * challenge that needs the code from the authenticator app or the text message.
   */
  login: async (identifier: string, password: string): Promise<AdminLogin> => {
    const result = await authApi.login({ identifier, password });
    if ("twoFactorRequired" in result) {
      return { challenge: { token: result.challengeToken, authenticator: !!result.authenticator } };
    }
    return { session: requireAdminSession(result) };
  },

  /** The second step of admin sign-in: the 6-digit code. */
  verifyLoginCode: async (challengeToken: string, code: string) => {
    return requireAdminSession(await authApi.loginTwoFactor(challengeToken, code));
  },

  /** Two-step verification with an authenticator app: status, set up, turn off. */
  twoFactorStatus: (token: string): Promise<{ ok: boolean; enabled: boolean }> => authFetch("/admin/2fa", token),
  twoFactorSetup: (token: string): Promise<{ ok: boolean; secret: string; qrDataUrl: string }> =>
    authFetch("/admin/2fa/setup", token, { method: "POST" }),
  twoFactorConfirm: (token: string, code: string) =>
    authFetch("/admin/2fa/confirm", token, { method: "POST", body: JSON.stringify({ code }) }),
  twoFactorDisable: (token: string, code: string) =>
    authFetch("/admin/2fa/disable", token, { method: "POST", body: JSON.stringify({ code }) }),

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
  /** A song's words with times ("[00:12] a line"), or "" to take them off. */
  musicLyrics: (token: string, id: string, lyrics: string) =>
    authFetch(`/admin/music/${id}/lyrics`, token, { method: "POST", body: JSON.stringify({ lyrics }) }),
  musicCover: async (token: string, id: string, file: Blob, fileName: string) => {
    const body = new FormData();
    body.append("cover", file, fileName);
    const response = await fetch(`${API_URL}/admin/music/${id}/cover`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(response.status === 413 ? "That picture is too big (3 MB at most)." : data.error || "Could not save the cover");
    return data as { ok: boolean; coverUrl: string };
  },
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
  /** Demo accounts for store and partner reviews: real accounts, flagged, deletable. */
  demoUsers: (token: string) => authFetch("/admin/demo-users", token),
  createDemoUser: (token: string, body: { username: string; password: string; fullName?: string }) =>
    authFetch("/admin/demo-users", token, { method: "POST", body: JSON.stringify(body) }),
  deleteDemoUser: (token: string, id: string) => authFetch(`/admin/demo-users/${id}`, token, { method: "DELETE" }),
  createCoupon: (
    token: string,
    body: { code: string; plan: string; months: number; validUntil?: string | null; maxUses?: number | null },
  ) => authFetch("/admin/coupons", token, { method: "POST", body: JSON.stringify(body) }),
  updateCoupon: (token: string, id: string, body: { active?: boolean }) =>
    authFetch(`/admin/coupons/${id}`, token, { method: "POST", body: JSON.stringify(body) }),
  // Plans and boost packs: price, title, on sale, Play product id.
  plans: (token: string) => authFetch("/admin/plans", token),
  updatePlan: (
    token: string,
    code: string,
    body: { title?: string; blurb?: string; amountPaise?: number; active?: boolean; playProductId?: string | null },
  ) => authFetch(`/admin/plans/${code}`, token, { method: "POST", body: JSON.stringify(body) }),
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
  resolveAppeal: (token: string, id: string, action: "restore" | "reject") => authFetch(`/admin/appeals/${id}/resolve`, token, { method: "POST", body: JSON.stringify({ action }) }),
  // A reported post: remove it (its owner is told why), or keep it.
  removePost: (token: string, postId: string) => authFetch(`/admin/posts/${postId}/remove`, token, { method: "POST" }),
  keepPost: (token: string, postId: string) => authFetch(`/admin/posts/${postId}/keep`, token, { method: "POST" }),
  resolveReport: (token: string, id: string, action: "actioned" | "dismissed") => authFetch(`/admin/reports/${id}/resolve`, token, { method: "POST", body: JSON.stringify({ action }) }),
  setUserRole: (token: string, id: string, role: "user" | "admin") => authFetch(`/admin/users/${id}/role`, token, { method: "POST", body: JSON.stringify({ role }) }),
  banUser: (token: string, id: string) => authFetch(`/admin/users/${id}/ban`, token, { method: "POST" }),
  unbanUser: (token: string, id: string) => authFetch(`/admin/users/${id}/unban`, token, { method: "POST" }),
  getPass: (token: string, id: string) => authFetch(`/admin/users/${id}/pass`, token),
  givePass: (token: string, id: string, plan: string, months: number) =>
    authFetch(`/admin/users/${id}/pass`, token, { method: "POST", body: JSON.stringify({ plan, months }) }),
  deletePass: (token: string, id: string) => authFetch(`/admin/users/${id}/pass`, token, { method: "DELETE" }),
  getCoins: (token: string, id: string) => authFetch(`/admin/users/${id}/coins`, token),
  /** A positive amount gives coins, a negative one takes them back. */
  giveCoins: (token: string, id: string, amount: number) =>
    authFetch(`/admin/users/${id}/coins`, token, { method: "POST", body: JSON.stringify({ amount }) }),
};