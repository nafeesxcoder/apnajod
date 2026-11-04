const crypto = require("crypto");
const { query } = require("../config/db");

async function getFullProfile(userId) {
  const [profile] = await query("SELECT * FROM profiles WHERE user_id = ?", [
    userId,
  ]);
  const photos = await query(
    "SELECT id, photo_url, position FROM profile_photos WHERE user_id = ? ORDER BY position ASC",
    [userId],
  );
  const vibes = await query(
    "SELECT vibe FROM profile_vibes WHERE user_id = ?",
    [userId],
  );
  const [intent] = await query(
    "SELECT * FROM profile_intent WHERE user_id = ?",
    [userId],
  );
  const [prefs] = await query(
    "SELECT * FROM matching_preferences WHERE user_id = ?",
    [userId],
  );
  const [mode] = await query(
    "SELECT mode FROM experience_mode WHERE user_id = ?",
    [userId],
  );
  return {
    profile: profile || null,
    photos: photos.map((p) => p.photo_url),
    vibes: vibes.map((v) => v.vibe),
    intent: intent || null,
    preferences: prefs
      ? {
          ...prefs,
          cities: safeParseJson(prefs.cities, []),
          intents: safeParseJson(prefs.intents, []),
          must_have_vibes: safeParseJson(prefs.must_have_vibes, []),
        }
      : null,
    experienceMode: mode?.mode || "seeking",
  };
}

function safeParseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function upsertProfile(userId, input) {
  const {
    firstName,
    gender,
    age,
    height,
    city,
    profession,
    religion,
    community,
    about,
    bio,
  } = input;

  // Bio ko 'about' column mein save karenge. Agar bio nahi hai toh about use karenge.
  const rawAbout = bio !== undefined ? bio : about;
  const profileAbout = rawAbout === undefined || rawAbout === null ? null : String(rawAbout).trim();

  await query(
    `INSERT INTO profiles (user_id, first_name, gender, age, height, city, profession, religion, community, about)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       first_name = VALUES(first_name), gender = VALUES(gender), age = VALUES(age),
       height = VALUES(height), city = VALUES(city), profession = VALUES(profession),
       religion = VALUES(religion), community = VALUES(community), about = COALESCE(VALUES(about), about)`,
    [
      userId,
      firstName || null,
      gender || null,
      age || null,
      height || null,
      city || null,
      profession || null,
      religion || null,
      community || null,
      profileAbout,
    ],
  );
}

async function submitVerification(userId, selfieUrl) {
  // Ab seedha verified nahi karenge, status 'pending' karenge
  await query(
    `UPDATE profiles 
     SET selfie_uri = ?, 
         verification_status = 'pending', 
         verified = 0 
     WHERE user_id = ?`,
    [selfieUrl, userId],
  );
}

async function replacePhotos(userId, photoUrls) {
  await query("DELETE FROM profile_photos WHERE user_id = ?", [userId]);
  for (let i = 0; i < photoUrls.length; i += 1) {
    await query(
      "INSERT INTO profile_photos (id, user_id, photo_url, position) VALUES (?, ?, ?, ?)",
      [crypto.randomUUID(), userId, photoUrls[i], i],
    );
  }
}

async function replaceVibes(userId, vibes) {
  await query("DELETE FROM profile_vibes WHERE user_id = ?", [userId]);
  // De-dupe: the client can send the same vibe twice (e.g. a fast
  // double-tap on the same chip before its selected state updates),
  // which previously crashed this request with a duplicate-key error
  // on (user_id, vibe) and left the update only partially applied.
  const uniqueVibes = [...new Set(vibes)];
  for (const vibe of uniqueVibes) {
    await query(
      "INSERT IGNORE INTO profile_vibes (user_id, vibe) VALUES (?, ?)",
      [userId, vibe],
    );
  }
}

async function upsertIntent(userId, input) {
  const { intent, timeline, children, family, relocation } = input;
  await query(
    `INSERT INTO profile_intent (user_id, intent, timeline, children, family, relocation)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       intent = VALUES(intent), timeline = VALUES(timeline), children = VALUES(children),
       family = VALUES(family), relocation = VALUES(relocation)`,
    [
      userId,
      intent || null,
      timeline || null,
      children || null,
      family || null,
      relocation || null,
    ],
  );
}

async function upsertPreferences(userId, input) {
  const {
    lookingFor,
    minAge,
    maxAge,
    cities,
    intents,
    mustHaveVibes,
    familyPriority,
    children,
    marriageTimeline,
    relocation,
    distancePreference,
    smartDiscovery,
  } = input;
  await query(
    `INSERT INTO matching_preferences
       (user_id, looking_for, min_age, max_age, cities, intents, must_have_vibes,
        family_priority, children, marriage_timeline, relocation, distance_preference, smart_discovery)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       looking_for = VALUES(looking_for), min_age = VALUES(min_age), max_age = VALUES(max_age),
       cities = VALUES(cities), intents = VALUES(intents), must_have_vibes = VALUES(must_have_vibes),
       family_priority = VALUES(family_priority), children = VALUES(children),
       marriage_timeline = VALUES(marriage_timeline), relocation = VALUES(relocation),
       distance_preference = VALUES(distance_preference), smart_discovery = VALUES(smart_discovery)`,
    [
      userId,
      lookingFor || "everyone",
      minAge ?? 21,
      maxAge ?? 45,
      JSON.stringify(cities || []),
      JSON.stringify(intents || []),
      JSON.stringify(mustHaveVibes || []),
      familyPriority || null,
      children || null,
      marriageTimeline || null,
      relocation || null,
      distancePreference ?? null,
      smartDiscovery ? 1 : 0,
    ],
  );
}

async function setExperienceMode(userId, mode) {
  await query(
    `INSERT INTO experience_mode (user_id, mode) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE mode = VALUES(mode)`,
    [userId, mode],
  );
}

async function markOnboardingComplete(userId) {
  await query("UPDATE profiles SET onboarding_complete = 1 WHERE user_id = ?", [
    userId,
  ]);
}

// ---------- Discovery: find real users matching preferences ----------
async function findMatches(userId, limit = 20) {
  const [myPrefs] = await query(
    "SELECT * FROM matching_preferences WHERE user_id = ?",
    [userId],
  );
  const minAge = myPrefs?.min_age ?? 21;
  const maxAge = myPrefs?.max_age ?? 45;
  const lookingFor = myPrefs?.looking_for || "everyone";
  let genderClause = "";
  if (lookingFor === "women") {
    genderClause = "AND p.gender = 'woman'";
  } else if (lookingFor === "men") {
    genderClause = "AND p.gender = 'man'";
  }

  const candidates = await query(
    `SELECT
       u.id AS user_id,
       p.first_name, p.gender, p.age, p.height, p.city, p.profession,
       p.religion, p.community, p.about, p.verified
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     WHERE u.id != ?
       AND u.deleted_at IS NULL
       AND p.onboarding_complete = 1
       AND p.age BETWEEN ? AND ?
       ${genderClause}
       AND u.id NOT IN (
         SELECT blocked_id FROM blocks WHERE blocker_id = ?
       )
       AND u.id NOT IN (
         SELECT blocker_id FROM blocks WHERE blocked_id = ?
       )
       AND u.id NOT IN (
         SELECT target_id FROM match_decisions WHERE actor_id = ?
       )
     ORDER BY p.updated_at DESC
     LIMIT ${Number(limit)}`,
    [userId, minAge, maxAge, userId, userId, userId], // <-- userId 3 baar add hua (2 block ke liye, 1 match_decisions ke liye)
  );

  const results = [];
  for (const candidate of candidates) {
    const photos = await query(
      "SELECT photo_url FROM profile_photos WHERE user_id = ? ORDER BY position ASC",
      [candidate.user_id],
    );
    const vibes = await query(
      "SELECT vibe FROM profile_vibes WHERE user_id = ?",
      [candidate.user_id],
    );
    const [intentRow] = await query(
      "SELECT intent, timeline, children, family, relocation FROM profile_intent WHERE user_id = ?",
      [candidate.user_id],
    );
    results.push({
      id: candidate.user_id,
      profileId: candidate.user_id,
      matchId: candidate.user_id,
      name: candidate.first_name || "Member",
      age: candidate.age || 0,
      city: candidate.city || "",
      profession: candidate.profession || "",
      gender: candidate.gender || "nonbinary",
      intent: intentRow?.intent || "",
      match: "Great Match",
      vibes: vibes.map((v) => v.vibe),
      photo: photos[0]?.photo_url || "",
      photos: photos.map((p) => p.photo_url),
      about: candidate.about || "",
      values: "",
      goals: "",
      timeline: intentRow?.timeline || "",
      children: intentRow?.children || "",
      family: intentRow?.family || "",
      relocation: intentRow?.relocation || "",
      languages: [],
      interests: [],
      familyPriority: "balanced",
      vouches: { count: 0, qualities: [] },
    });
  }
  return results;
}

module.exports = {
  getFullProfile,
  upsertProfile,
  submitVerification,
  replacePhotos,
  replaceVibes,
  upsertIntent,
  upsertPreferences,
  setExperienceMode,
  markOnboardingComplete,
  findMatches,
};
