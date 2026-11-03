import type { Match } from '../data';
import { defaultMatchFilters, type DiscoverySignal, type MatchFilters } from '../storage';

export type MatchPreferences = {
  intent: string;
  vibes: string[];
  filters?: MatchFilters;
};

const cityName = (value: string) => value.split(',')[0]?.trim().toLowerCase() ?? '';
const stateCode = (value: string) => value.split(',')[1]?.trim().toLowerCase() ?? '';
const cityMatches = (match: Match, city: string) => cityName(match.city) === cityName(city);
const stateMatches = (match: Match, city: string) => !!stateCode(city) && stateCode(match.city) === stateCode(city);

export function scoreMatch(match: Match, preferences: MatchPreferences, signals: DiscoverySignal[]) {
  const filters = preferences.filters ?? defaultMatchFilters;
  const distancePreference = filters.distancePreference ?? 'anywhere';
  const sharedVibes = match.vibes.filter((vibe) => preferences.vibes.includes(vibe)).length;
  const intentScore = match.intent === preferences.intent ? 3 : 0;
  const filterIntentScore = filters.intents.length && filters.intents.includes(match.intent) ? 5 : 0;
  const mustHaveVibeScore = filters.mustHaveVibes.filter((vibe) => match.vibes.includes(vibe)).length * 4;
  const familyScore =
    filters.familyPriority === 'high'
      ? match.familyPriority === 'high' || match.vibes.includes('Family First') ? 10 : -4
      : filters.familyPriority === 'balanced' && match.familyPriority === 'balanced' ? 5 : 0;
  const childrenScore =
    filters.children === 'wants' && match.children.toLowerCase().includes('wants') ? 5 :
    filters.children === 'open' && match.children.toLowerCase().includes('open') ? 4 :
    filters.children === 'does_not_want' && match.children.toLowerCase().includes('not') ? 4 : 0;
  const timelineScore =
    filters.marriageTimeline === '1_2_years' && match.timeline.includes('1–2') ? 5 :
    filters.marriageTimeline === '2_3_years' && match.timeline.includes('2–3') ? 4 : 0;
  const relocationScore =
    filters.relocation === 'open' && match.relocation.toLowerCase().includes('open') ? 3 :
    filters.relocation === 'same_city' && match.relocation.toLowerCase().includes('prefer') ? 3 : 0;
  const locationScore = filters.cities.length && distancePreference !== 'anywhere'
    ? filters.cities.some((city) => cityMatches(match, city)) ? 8 : filters.cities.some((city) => stateMatches(match, city)) ? 4 : -2
    : 0;
  const behaviorScore = signals.reduce((total, signal) => {
    if (signal.matchId !== match.id) return total;
    if (signal.type === 'interested') return total + 6;
    if (signal.type === 'skip') return total - 8;
    return total + 0.5;
  }, 0);
  return sharedVibes * 2 + intentScore + filterIntentScore + mustHaveVibeScore + familyScore + childrenScore + timelineScore + relocationScore + locationScore + behaviorScore;
}

export function passesFilters(match: Match, filters: MatchFilters = defaultMatchFilters) {
  const distancePreference = filters.distancePreference ?? 'anywhere';
  if (filters.lookingFor === 'Women' && match.gender !== 'woman') return false;
  if (filters.lookingFor === 'Men' && match.gender !== 'man') return false;
  if (match.age < filters.minAge || match.age > filters.maxAge) return false;
  if (filters.cities.length && !['same_state','open_to_relocate'].includes(distancePreference) && !filters.cities.some((city) => cityMatches(match, city))) return false;
  if (distancePreference === 'selected_cities' && filters.cities.length && !filters.cities.some((city) => cityMatches(match, city))) return false;
  if (distancePreference === 'same_state' && filters.cities.length && !filters.cities.some((city) => stateMatches(match, city) || cityMatches(match, city))) return false;
  if (distancePreference === 'open_to_relocate' && !match.relocation.toLowerCase().includes('open')) return false;
  if (filters.intents.length && !filters.intents.includes(match.intent)) return false;
  if (filters.mustHaveVibes.length && !filters.mustHaveVibes.every((vibe) => match.vibes.includes(vibe))) return false;
  if (filters.familyPriority === 'high' && match.familyPriority !== 'high' && !match.vibes.includes('Family First')) return false;
  if (filters.familyPriority === 'balanced' && match.familyPriority === 'independent') return false;
  if (filters.children === 'wants' && !match.children.toLowerCase().includes('wants')) return false;
  if (filters.children === 'open' && !match.children.toLowerCase().includes('open')) return false;
  if (filters.children === 'does_not_want' && !match.children.toLowerCase().includes('not')) return false;
  if (filters.marriageTimeline === '1_2_years' && !match.timeline.includes('1–2')) return false;
  if (filters.marriageTimeline === '2_3_years' && !match.timeline.includes('2–3')) return false;
  if (filters.relocation === 'open' && !match.relocation.toLowerCase().includes('open')) return false;
  if (filters.relocation === 'same_city' && match.relocation.toLowerCase().includes('open')) return false;
  return true;
}

export function rankMatches(
  matches: Match[],
  preferences: MatchPreferences,
  signals: DiscoverySignal[],
  blockedIds: string[],
  enabled = true,
) {
  const filters = preferences.filters ?? defaultMatchFilters;
  const visible = matches.filter((match) => !blockedIds.includes(match.id) && passesFilters(match, filters));
  if (!enabled) return visible;
  return visible
    .map((match, index) => ({ match, index, score: scoreMatch(match, preferences, signals) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ match }) => match);
}

export function matchReasons(match: Match, preferences: MatchPreferences) {
  const filters = preferences.filters ?? defaultMatchFilters;
  const reasons: string[] = [];
  const sharedVibes = match.vibes.filter((vibe) => preferences.vibes.includes(vibe));
  if (sharedVibes.length) reasons.push(`${sharedVibes.slice(0, 2).join(' + ')} aligned`);
  if (filters.familyPriority === 'high' && (match.familyPriority === 'high' || match.vibes.includes('Family First'))) reasons.push('Family-first match');
  if (filters.children !== 'any' && passesFilters(match, { ...defaultMatchFilters, ...filters, mustHaveVibes: [], intents: [], cities: [] })) reasons.push('Future plans align');
  if (filters.cities.length && filters.cities.some((city) => cityMatches(match, city) || stateMatches(match, city))) reasons.push('Location preference');
  if (match.intent === preferences.intent) reasons.push('Same relationship intent');
  return reasons.slice(0, 3);
}

export function publicMatchLabel(score: number): Match['match'] {
  if (score >= 80) return 'Exceptional Match';
  if (score >= 60) return 'Great Match';
  return 'Strong Match';
}
