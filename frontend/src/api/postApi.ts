import { API_URL } from "./config";

/** Who posted, commented or liked. */
export type PostAuthor = {
  userId: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

export type Post = {
  id: string;
  media_url: string;
  caption: string;
  /** Width / height the post was cropped to: 1, 0.8 (4:5) or 1.91. Older posts: 1. */
  aspect_ratio?: number;
  created_at: string;
  author?: PostAuthor;
  likes?: number;
  comments?: number;
  /** Whether you have liked / saved it. */
  liked?: boolean;
  saved?: boolean;
};

export type PostComment = {
  id: string;
  body: string;
  created_at: string;
  author: PostAuthor;
  /** Your own comment, or any comment on your own post. */
  canDelete: boolean;
};

export type PostCounts = { likes: number; comments: number; liked: boolean; saved: boolean };

/** The link that opens a post in the app. */
export const postLink = (postId: string) => `https://apnajoda.com/?post=${encodeURIComponent(postId)}`;

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

  /**
   * Someone else's posts. A private account you have not matched with comes
   * back locked: no posts, just how many there are (as on Instagram).
   */
  async of(accessToken: string, userId: string): Promise<{ posts: Post[]; locked: boolean; count: number }> {
    const data = await authFetch(`/posts/user/${userId}`, accessToken);
    const posts = (data.posts as Post[]) || [];
    return { posts, locked: !!data.locked, count: Number(data.count ?? posts.length) };
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

  /** One post - what a shared link opens. */
  async get(accessToken: string, postId: string): Promise<Post> {
    const data = await authFetch(`/posts/${encodeURIComponent(postId)}`, accessToken);
    return data.post as Post;
  },

  async like(accessToken: string, postId: string, on: boolean): Promise<PostCounts> {
    return authFetch(`/posts/${postId}/like`, accessToken, { method: on ? "POST" : "DELETE" });
  },

  async likers(accessToken: string, postId: string): Promise<PostAuthor[]> {
    const data = await authFetch(`/posts/${postId}/likes`, accessToken);
    return (data.users as PostAuthor[]) || [];
  },

  async comments(accessToken: string, postId: string): Promise<PostComment[]> {
    const data = await authFetch(`/posts/${postId}/comments`, accessToken);
    return (data.comments as PostComment[]) || [];
  },

  async addComment(accessToken: string, postId: string, body: string): Promise<PostComment> {
    const data = await authFetch(`/posts/${postId}/comments`, accessToken, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    return data.comment as PostComment;
  },

  async deleteComment(accessToken: string, postId: string, commentId: string) {
    return authFetch(`/posts/${postId}/comments/${commentId}`, accessToken, { method: "DELETE" });
  },

  async save(accessToken: string, postId: string, on: boolean): Promise<{ saved: boolean }> {
    return authFetch(`/posts/${postId}/save`, accessToken, { method: on ? "POST" : "DELETE" });
  },

  /**
   * The Home feed: public accounts' posts and your matches' posts, newest
   * first. Pass the `next` from the previous page to get the one after it.
   */
  async feed(accessToken: string, before?: string | null): Promise<{ posts: Post[]; next: string | null }> {
    const query = before ? `?before=${encodeURIComponent(before)}` : "";
    const data = await authFetch(`/posts/feed${query}`, accessToken);
    return { posts: (data.posts as Post[]) || [], next: (data.next as string) || null };
  },

  /** Your saved posts - only you see these. */
  async saved(accessToken: string): Promise<Post[]> {
    const data = await authFetch("/posts/saved", accessToken);
    return (data.posts as Post[]) || [];
  },
};
