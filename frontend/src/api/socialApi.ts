/**
 * Finding people, following them, and the privacy switch.
 *
 * This is what replaced matching: there is no curated deck, so every person
 * in the app arrives either from a username search or from the member's own
 * contacts, and whether they can be messaged depends on the follow graph.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

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

/** A person as they appear in a search result or a list. */
export type SocialUser = {
  userId: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  /**
   * Where the like between you stands. This replaced following /
   * requested / followsYou: there is no following on this app, so a row
   * labelled itself from a graph nothing writes to and said "Like" even
   * to somebody already matched with.
   */
  likeStatus?: "none" | "pending" | "likes_you" | "accepted";
};

/** The dating profile behind a person page: what you decide from. */
export type ProfileCard = {
  firstName: string;
  age: number;
  city: string;
  profession: string;
  religion: string;
  community: string;
  about: string;
  verified: boolean;
  hobbies: string[];
  photos: string[];
};

/**
 * Where a like between the two of you stands.
 *
 *   none       neither has liked the other
 *   pending    you liked them and are waiting
 *   likes_you  they liked you; it is yours to accept
 *   accepted   both of you, so the chat is open
 */
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
  /** 'private' | 'blocked' | 'not_found' | 'self' when canMessage is false. */
  messageBlockedReason: string | null;
};

export const socialApi = {
  async search(accessToken: string, term: string): Promise<SocialUser[]> {
    const data = await authFetch(
      `/social/search?q=${encodeURIComponent(term)}`,
      accessToken,
    );
    return data.results ?? [];
  },

  /**
   * Match a contact list against accounts. The numbers are sent for this one
   * request and are not stored, so the list has to be sent each time.
   */
  async matchContacts(accessToken: string, phones: string[]): Promise<SocialUser[]> {
    const data = await authFetch("/social/contacts", accessToken, {
      method: "POST",
      body: JSON.stringify({ phones }),
    });
    return data.results ?? [];
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
