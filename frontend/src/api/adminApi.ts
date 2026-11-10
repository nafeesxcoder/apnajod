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
  users: (token: string, q = "") => authFetch(`/admin/users?q=${encodeURIComponent(q)}`, token),
  verifications: (token: string) => authFetch("/admin/verifications", token),
  approveVerification: (token: string, id: string) => authFetch(`/admin/verifications/${id}/approve`, token, { method: "POST" }),
  rejectVerification: (token: string, id: string) => authFetch(`/admin/verifications/${id}/reject`, token, { method: "POST" }),
  reports: (token: string) => authFetch("/admin/reports", token),
  resolveReport: (token: string, id: string, action: "actioned" | "dismissed") => authFetch(`/admin/reports/${id}/resolve`, token, { method: "POST", body: JSON.stringify({ action }) }),
  setUserRole: (token: string, id: string, role: "user" | "admin") => authFetch(`/admin/users/${id}/role`, token, { method: "POST", body: JSON.stringify({ role }) }),
  banUser: (token: string, id: string) => authFetch(`/admin/users/${id}/ban`, token, { method: "POST" }),
  unbanUser: (token: string, id: string) => authFetch(`/admin/users/${id}/unban`, token, { method: "POST" }),
};