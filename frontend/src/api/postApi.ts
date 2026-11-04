const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://31.42.125.109:4000";

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

export const postApi = {
  async create(accessToken: string, mediaUrl: string, caption: string) {
    return authFetch("/posts", accessToken, {
      method: "POST",
      body: JSON.stringify({ mediaUrl, caption }),
    });
  },
  async getMyPosts(accessToken: string) {
    return authFetch("/posts", accessToken);
  },
  async delete(accessToken: string, postId: string) {
    return authFetch(`/posts/${postId}`, accessToken, { method: "DELETE" });
  },
};