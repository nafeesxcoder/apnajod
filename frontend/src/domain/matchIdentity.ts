export type MatchIdentity = {
  id: string;
  profileId?: string;
  matchId?: string;
};

// Mock records use one local key. Production records carry the distinct
// profile and relationship identifiers returned by daily_matches.
export function profileIdFor(match: MatchIdentity) {
  return match.profileId ?? match.id;
}

export function conversationIdFor(match: MatchIdentity) {
  return match.matchId ?? match.id;
}

export function hasProductionMatchIdentity(match: MatchIdentity) {
  return Boolean(match.profileId && match.matchId);
}
