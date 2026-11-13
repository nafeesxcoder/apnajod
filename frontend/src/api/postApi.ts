import { API_URL } from "./config";

export type Post = {
  id: string;
  media_url: string;
  caption: string;
  /** Width / height the post was cropped to: 1, 0.8 (4:5) or 1.91. Older posts: 1. */
  aspect_ratio?: number;
  created_at: string;
};

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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const postApi = {
  /**
   * The photo must already be uploaded; pass the URL the upload returned.
   * aspectRatio is the shape it was cropped to (1, 0.8 or 1.91).
   */
  async create(accessToken: string, mediaUrl: string, caption: string, aspectRatio = 1) {
    return authFetch("/posts", accessToken, {
      method: "POST",
      body: JSON.stringify({ mediaUrl, caption, aspectRatio }),
    });
  },

  async mine(accessToken: string): Promise<Post[]> {
    const data = await authFetch("/posts", accessToken);
    return (data.posts as Post[]) || [];
  },

  async of(accessToken: string, userId: string): Promise<Post[]> {
    const data = await authFetch(`/posts/user/${userId}`, accessToken);
    return (data.posts as Post[]) || [];
  },

  /** Only the words change; the photo stays as posted. */
  async updateCaption(accessToken: string, postId: string, caption: string) {
    return authFetch(`/posts/${postId}`, accessToken, {
      method: "PUT",
      body: JSON.stringify({ caption }),
    });
  },

  async remove(accessToken: string, postId: string) {
    return authFetch(`/posts/${postId}`, accessToken, { method: "DELETE" });
  },
};
