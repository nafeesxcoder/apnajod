import { API_URL } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_KEY = "milaan_access_token";
const REFRESH_KEY = "milaan_refresh_token";
let refreshInFlight: Promise<{
  accessToken: string;
  refreshToken: string;
} | null> | null = null;

export class AuthRequestError extends Error {
  status: number;
  /** Machine-readable reason from the server, e.g. "account_suspended". */
  code?: string;
  /** Extra fields the server sent with the error (e.g. an appeal token). */
  details?: Record<string, unknown>;
  constructor(
    message: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = typeof details?.code === "string" ? details.code : undefined;
  }
}
// True only when the server says the saved session is invalid or expired.
export const isSessionRejected = (error: unknown) =>
  error instanceof AuthRequestError &&
  (error.status === 401 || error.status === 403);

export type AuthSession = {
  ok: true;
  user: {
    id: string;
    phone: string | null;
    email: string | null;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    phoneVerified: boolean;
    emailVerified: boolean;
    hasPassword: boolean;
    mustChangePassword: boolean;
    role?: "user" | "admin" | string | null;
  };
  accessToken: string;
  refreshToken: string;
  accountRestored?: boolean;
  accountReactivated?: boolean;
  mustChangePassword?: boolean;
};

/** POST helper that turns a server error into a readable message. */
async function post<T>(route: string, body: unknown, fallback: string): Promise<T> {
  const response = await fetch(`${API_URL}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}) as Record<string, unknown>);
  if (!response.ok) {
    const failure = data as { error?: string; details?: Record<string, unknown> };
    throw new AuthRequestError(
      failure.error || fallback,
      response.status,
      failure.details,
    );
  }
  return data as T;
}

export const authApi = {
  // ---- Sign up: mobile + username + password, confirmed by one SMS code ----
  async checkUsername(username: string) {
    const response = await fetch(
      `${API_URL}/auth/username/available?username=${encodeURIComponent(username)}`,
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AuthRequestError(data.error || "Could not check that username", response.status);
    }
    return data as { available: boolean; reason: string; username?: string };
  },
  registerStart(input: { phone: string; username: string; password: string }) {
    return post<{ phone: string; username: string; expiresInSeconds: number }>(
      "/auth/register",
      input,
      "Could not start sign-up",
    );
  },
  registerVerify(input: { phone: string; username: string; password: string; code: string }) {
    return post<AuthSession>("/auth/register/verify", input, "Could not create your account");
  },

  // ---- Sign in with username (or mobile) + password ----
  login(input: { identifier: string; password: string }) {
    return post<AuthSession>("/auth/login", input, "Could not sign you in");
  },
  /** A suspended member asks for a review; lands in the admin dashboard. */
  submitAppeal(appealToken: string, message: string) {
    return post<{ ok: boolean; updated?: boolean }>(
      "/auth/appeal",
      { appealToken, message },
      "Could not send your appeal",
    );
  },

  // ---- Forgot password: OTP to the registered mobile, then a new password ----
  forgotPassword(identifier: string) {
    return post<{ sent: boolean; message: string; maskedPhone?: string; expiresInSeconds: number }>(
      "/auth/password/forgot",
      { identifier },
      "Could not send the code",
    );
  },
  resetPassword(input: { identifier: string; code: string; password: string }) {
    return post<AuthSession>("/auth/password/reset", input, "Could not reset your password");
  },
  async changePassword(accessToken: string, input: { currentPassword: string; password: string }) {
    const response = await fetch(`${API_URL}/auth/password/change`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AuthRequestError(data.error || "Could not change your password", response.status);
    }
    return data as { accessToken: string; refreshToken: string };
  },

  async requestOtp(channel: "phone" | "email", identifier: string) {
    const response = await fetch(`${API_URL}/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, identifier }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to send OTP");
    return data;
  },
  async verifyOtp(
    channel: "phone" | "email",
    identifier: string,
    code: string
  ) {
    const response = await fetch(`${API_URL}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, identifier, code }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Verification failed");
    return data;
  },
  async refresh(refreshToken: string) {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AuthRequestError(
        data.error || "Refresh failed",
        response.status,
      );
    }
    return data;
  },
  // Refreshes the saved session. Calls made at the same time share one request
  // (refresh tokens are single-use, so two parallel calls would make the second
  // one fail and sign the person out). Returns null when there is no saved
  // session. Throws AuthRequestError; only status 401/403 means the session is
  // really gone, anything else (offline, server error) is temporary.
  refreshSavedSession(): Promise<{
    accessToken: string;
    refreshToken: string;
  } | null> {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const saved = await AsyncStorage.getItem(REFRESH_KEY);
        if (!saved) return null;
        const tokens = await authApi.refresh(saved);
        await AsyncStorage.setItem(ACCESS_KEY, tokens.accessToken);
        await AsyncStorage.setItem(REFRESH_KEY, tokens.refreshToken);
        return {
          accessToken: tokens.accessToken as string,
          refreshToken: tokens.refreshToken as string,
        };
      })().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  },
  async me(accessToken: string) {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load profile");
    return data;
  },
  async logout(accessToken: string) {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Logout failed");
    return data;
  },
  async deleteAccount(accessToken: string) {
    const response = await fetch(`${API_URL}/auth/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Account deletion failed");
    return data;
  },
  async deactivateAccount(accessToken: string) {
    const response = await fetch(`${API_URL}/auth/deactivate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Account deactivation failed");
    return data;
  },
  oauthUrl(provider: "google" | "apple" | "linkedin") {
    return `${API_URL}/auth/${provider}`;
  },
};