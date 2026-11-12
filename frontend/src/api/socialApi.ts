import { API_URL } from "./config";

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

export type SocialUser = {
  userId: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  likeStatus?: "none" | "pending" | "likes_you" | "accepted";
};

export type ProfileCard = {
  firstName: string;
  age: number;
  city: string;
  profession: string;
  religion: string;
  community: string;
  about: string;
  verified: boolean;
  /** Approved selfie AND Pro, worked out on the server. */
  blueTick?: boolean;
  /** Their intent and alignment answers, for the intent badges. */
  intent?: {
    intent?: string;
    timeline?: string;
    children?: string;
    family?: string;
    relocation?: string;
  } | null;
  hobbies: string[];
  photos: string[];
};

export type LikeState = {
  iLiked: boolean;
  theyLiked: boolean;
  matched: boolean;
  status: "none" | "pending" | "likes_you" | "accepted";
};

export type PersonPage = {
  user: SocialUser;
  profile: ProfileCard;
  like: LikeState;
  counts: { followers: number; following: number };
  state: {
    self: boolean;
    following?: boolean;
    requested?: boolean;
    followsYou?: boolean;
    requestsYou?: boolean;
  };
  canMessage: boolean;
  messageBlockedReason: string | null;
};

export type ContactsMatchResult = {
  matched: SocialUser[];
  unmatched: string[];
};

export const socialApi = {
  async search(accessToken: string, term: string): Promise<SocialUser[]> {
    const data = await authFetch(
      `/social/search?q=${encodeURIComponent(term)}`,
      accessToken,
    );
    return data.results ?? [];
  },

  async matchContacts(
    accessToken: string,
    phones: string[],
  ): Promise<ContactsMatchResult> {
    const data = await authFetch("/social/contacts", accessToken, {
      method: "POST",
      body: JSON.stringify({ phones }),
    });
    return {
      matched: data.matched ?? [],
      unmatched: data.unmatched ?? [],
    };
  },

  async person(accessToken: string, userId: string): Promise<PersonPage> {
    const data = await authFetch(`/social/users/${userId}`, accessToken);
    return {
      user: data.user,
      profile: data.profile ?? {
        firstName: "", age: 0, city: "", profession: "", religion: "",
        community: "", about: "", verified: false, hobbies: [], photos: [],
      },
      like: data.like ?? {
        iLiked: false, theyLiked: false, matched: false, status: "none",
      },
      counts: data.counts,
      state: data.state,
      canMessage: !!data.canMessage,
      messageBlockedReason: data.messageBlockedReason ?? null,
    };
  },

  async setPrivacy(accessToken: string, isPrivate: boolean) {
    return authFetch("/social/privacy", accessToken, {
      method: "PUT",
      body: JSON.stringify({ isPrivate }),
    });
  },
};