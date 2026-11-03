import type { Match } from '../data';

export type ServerDailyMatchRow = {
  profile_id: string;
  match_id: string;
  first_name: string;
  age: number;
  city: string;
  profession: string;
  bio: string | null;
  verified: boolean;
  gender: string;
  intent: string;
  vibes: string[];
  family_priority: string;
  children_intent: string;
  marriage_timeline: string;
  relocation: string;
  languages: string[];
  vouch_count: number;
  photo_paths: string[];
  match_label: string;
  reasons: string[];
  model_version: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function intentLabel(intent: string) {
  if (intent === 'marriage') return 'Marriage';
  if (intent === 'long_term') return 'Long-term Relationship';
  return 'Long-term, leading to Marriage';
}

function matchLabel(label: string): Match['match'] {
  const normalized = label.toLowerCase();
  if (normalized.includes('exceptional')) return 'Exceptional Match';
  if (normalized.includes('great')) return 'Great Match';
  return 'Strong Match';
}

function timelineLabel(value: string) {
  if (value === '1_2_years') return 'Marriage in 1–2 years';
  if (value === '2_3_years') return 'Marriage in 2–3 years';
  return 'Marriage timeline is open';
}

function childrenLabel(value: string) {
  if (value === 'wants') return 'Wants children';
  if (value === 'does_not_want') return 'Does not want children';
  return 'Open to children';
}

function relocationLabel(value: string) {
  if (value === 'same_city') return 'Prefers the same city';
  if (value === 'not_open') return 'Not open to relocation';
  return 'Open for the right person';
}

export function parseServerDailyMatch(row: ServerDailyMatchRow, signedPhotoUrls: string[]): Match | null {
  if (!uuidPattern.test(row.profile_id) || !uuidPattern.test(row.match_id)) return null;
  if (!row.first_name.trim() || !row.city.trim() || !row.profession.trim()) return null;
  if (!Number.isInteger(row.age) || row.age < 18 || row.age > 90) return null;
  if (!['woman', 'man', 'nonbinary'].includes(row.gender)) return null;
  const photos = signedPhotoUrls.filter((url) => /^https?:\/\//i.test(url));
  if (!photos.length) return null;
  const reasons = row.reasons.filter((reason) => reason.trim().length > 0).slice(0, 3);
  const familyPriority: Match['familyPriority'] =
    row.family_priority === 'high' || row.family_priority === 'independent'
      ? row.family_priority
      : 'balanced';

  return {
    id: row.profile_id,
    profileId: row.profile_id,
    matchId: row.match_id,
    name: row.first_name.trim(),
    age: row.age,
    city: row.city.trim(),
    profession: row.profession.trim(),
    gender: row.gender as Match['gender'],
    intent: intentLabel(row.intent),
    match: matchLabel(row.match_label),
    vibes: row.vibes.slice(0, 5),
    photo: photos[0]!,
    photos,
    about: row.bio?.trim() || 'Looking for a thoughtful, lasting relationship.',
    values: reasons.length ? reasons.join(' · ') : 'Intentional dating and mutual respect.',
    goals: timelineLabel(row.marriage_timeline),
    timeline: timelineLabel(row.marriage_timeline),
    children: childrenLabel(row.children_intent),
    family: familyPriority === 'high' ? 'Family is deeply important' : familyPriority === 'independent' ? 'Independent family rhythm' : 'Balanced family involvement',
    relocation: relocationLabel(row.relocation),
    languages: row.languages.slice(0, 10),
    interests: row.vibes.slice(0, 5),
    familyPriority,
    vouches: { count: Math.max(0, Math.min(3, row.vouch_count)), qualities: [] },
    reasons,
    modelVersion: row.model_version,
  };
}

