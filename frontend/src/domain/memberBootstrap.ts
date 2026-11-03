export type MemberBootstrap = {
  userId: string;
  profile: null | { first_name: string | null; city: string | null; profession: string | null; religion: string | null; community: string | null; verified: boolean | null; onboarding_complete: boolean | null };
  matchingPreferences: null | { looking_for: string; min_age: number; max_age: number; cities: string[]; intents: string[]; must_have_vibes: string[]; family_priority: 'any'|'high'|'balanced'; children: 'any'|'wants'|'open'|'does_not_want'; marriage_timeline: 'any'|'1_2_years'|'2_3_years'; relocation: 'any'|'open'|'same_city'; distance_preference: 'anywhere'|'selected_cities'|'same_state'|'open_to_relocate'; smart_discovery: boolean };
  matchAttributes: null | { gender: ''|'woman'|'man'|'nonbinary'|null };
};

export function memberNeedsOnboarding(member: MemberBootstrap) {
  return !member.profile?.onboarding_complete;
}
