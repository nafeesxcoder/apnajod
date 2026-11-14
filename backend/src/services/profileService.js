const crypto = require("crypto");
const { query } = require("../config/db");
const billingService = require("./billingService");
const limits = require("../config/billing");
const { ApiError } = require("../middleware/errorHandler");

const BIO_MAX_LENGTH = 500;
// Apnajoda is for adults. The app checks this too, but the API is the only
// check that cannot be skipped by calling it directly.
const MIN_AGE = 18;
/** A profile you passed on comes back into your introductions after this many days. */
const PASS_RETURN_DAYS = 14;
const MAX_AGE = 70;

/**
 * The age to save, or null when none was sent (which keeps the saved one).
 * Anything sent must be a whole number from 18 to 70.
 */
function cleanAge(value) {
  if (value === undefined || value === null || value === "") return null;
  const age = Number(value);
  if (!Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) {
    throw new ApiError(400, `You must be ${MIN_AGE} or older to use Apnajoda.`);
  }
  return age;
}

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

  const hobbies = profile?.hobbies ? safeParseJson(profile.hobbies, []) : [];
  const trust = await billingService.trustStatus(userId);

  return {
    profile: profile
      ? {
          ...profile,
          hobbies,
          blue_tick: trust.blueTick,
        }
      : null,
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
    hobbies,
  } = input;

  const rawAbout = bio !== undefined ? bio : about;
  const profileAbout =
    rawAbout === undefined || rawAbout === null
      ? null
      : String(rawAbout).trim();

  if (profileAbout !== null && profileAbout.length > BIO_MAX_LENGTH) {
    throw new ApiError(
      400,
      `Bio must be ${BIO_MAX_LENGTH} characters or less.`,
    );
  }

  const profileAge = cleanAge(age);

  const profileHobbies = Array.isArray(hobbies)
    ? JSON.stringify(hobbies)
    : null;

  await query(
    `INSERT INTO profiles (user_id, first_name, gender, age, height, city, profession, religion, community, about, hobbies)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       first_name = VALUES(first_name), gender = VALUES(gender), age = COALESCE(VALUES(age), age),
       height = VALUES(height), city = VALUES(city), profession = VALUES(profession),
       religion = VALUES(religion), community = VALUES(community),
       about = COALESCE(VALUES(about), about),
       hobbies = COALESCE(VALUES(hobbies), hobbies)`,
    [
      userId,
      firstName || null,
      gender || null,
      profileAge,
      height || null,
      city || null,
      profession || null,
      religion || null,
      community || null,
      profileAbout,
      profileHobbies,
    ],
  );
}

/**
 * Pose selfie.
 *
 * A plain selfie proves little: anyone can send a photo of someone else.
 * Before taking the selfie the member is given one random pose, and the
 * admin approves only when the selfie shows that pose AND the face matches
 * the profile photos. A stolen or old photo will not have the pose in it.
 *
 * None of these depend on left or right - a front camera mirrors, so the
 * reviewer could not tell which hand was which.
 */
const VERIFICATION_POSES = [
  { code: "thumbs_up", emoji: "👍", text: "Give a thumbs up next to your face" },
  { code: "two_fingers", emoji: "✌️", text: "Hold up two fingers (peace sign)" },
  { code: "three_fingers", emoji: "🤟", text: "Hold up three fingers" },
  { code: "four_fingers", emoji: "🖐️", text: "Hold up four fingers, thumb folded in" },
  { code: "open_palm", emoji: "✋", text: "Show your open palm to the camera" },
  { code: "ok_sign", emoji: "👌", text: "Make an OK sign next to your face" },
  { code: "point_nose", emoji: "☝️", text: "Point at your nose with one finger" },
  { code: "hand_on_head", emoji: "🙆", text: "Put one hand on top of your head" },
  { code: "touch_ear", emoji: "👂", text: "Touch your ear with one hand" },
  { code: "call_me", emoji: "🤙", text: "Make a call-me sign next to your face" },
];

/** How long a pose stays valid. Long enough to take the photo, not to fake it. */
const POSE_VALID_MINUTES = 15;

function poseByCode(code) {
  return VERIFICATION_POSES.find((pose) => pose.code === code) || null;
}

/** Hand out a fresh random pose, never the same one twice in a row. */
async function issueVerificationPose(userId, random = Math.random) {
  const [row] = await query(
    "SELECT verification_pose FROM profiles WHERE user_id = ?",
    [userId],
  );
  if (!row) {
    throw new ApiError(400, "Complete your profile before verifying");
  }
  const choices = VERIFICATION_POSES.filter(
    (pose) => pose.code !== row.verification_pose,
  );
  const pose = choices[Math.floor(random() * choices.length)] || choices[0];
  await query(
    `UPDATE profiles
        SET verification_pose = ?,
            verification_pose_issued_at = UTC_TIMESTAMP()
      WHERE user_id = ?`,
    [pose.code, userId],
  );
  return { ...pose, validMinutes: POSE_VALID_MINUTES };
}

/**
 * Only accepted against a pose issued in the last few minutes. The check
 * and the write are one statement, so there is no gap between them, and
 * the pose is spent on success - the same pose cannot be submitted twice.
 * The pose code itself stays on the row so the reviewer can see it.
 */
async function submitVerification(userId, selfieUrl) {
  const result = await query(
    `UPDATE profiles
     SET selfie_uri = ?,
         verification_status = 'pending',
         verified = 0,
         verification_pose_issued_at = NULL
     WHERE user_id = ?
       AND verification_pose IS NOT NULL
       AND verification_pose_issued_at > UTC_TIMESTAMP() - INTERVAL ${POSE_VALID_MINUTES} MINUTE`,
    [selfieUrl, userId],
  );
  if ((result?.affectedRows ?? 0) === 0) {
    throw new ApiError(
      409,
      "Your pose has expired. Get a new pose and take the selfie again.",
    );
  }
}

async function listPendingVerifications(limit = 50) {
  const rows = await query(
    `SELECT u.id AS user_id, u.username, u.phone, u.avatar_url,
            p.first_name, p.age, p.city, p.gender, p.selfie_uri,
            p.verification_pose, p.verification_status, p.updated_at
       FROM profiles p
       JOIN users u ON u.id = p.user_id
      WHERE p.verification_status = 'pending'
        AND u.deleted_at IS NULL
      ORDER BY p.updated_at ASC
      LIMIT ${Number(limit)}`,
  );
  if (!rows.length) return rows;

  // The profile photos go alongside the selfie, so the reviewer compares
  // faces side by side instead of approving a selfie on its own.
  const ids = rows.map((row) => row.user_id);
  const photoRows = await query(
    `SELECT user_id, photo_url FROM profile_photos
      WHERE user_id IN (${ids.map(() => "?").join(",")})
      ORDER BY user_id, position ASC`,
    ids,
  );
  const photosByUser = new Map();
  for (const photo of photoRows) {
    const list = photosByUser.get(photo.user_id) ?? [];
    list.push(photo.photo_url);
    photosByUser.set(photo.user_id, list);
  }

  return rows.map((row) => {
    const photos = photosByUser.get(row.user_id) ?? [];
    return {
      ...row,
      pose: poseByCode(row.verification_pose),
      photos: photos.length ? photos : [row.avatar_url].filter(Boolean),
    };
  });
}

async function setVerificationStatus(userId, status) {
  if (!["none", "pending", "approved", "rejected"].includes(status)) {
    throw new Error(`Unknown verification status: ${status}`);
  }
  await query(
    `UPDATE profiles
        SET verification_status = ?,
            verified = ?
      WHERE user_id = ?`,
    [status, status === "approved" ? 1 : 0, userId],
  );
  return { userId, status };
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

async function findMatches(userId, limit = 20) {
  const [myPrefs] = await query(
    "SELECT * FROM matching_preferences WHERE user_id = ?",
    [userId],
  );
  const minAge = myPrefs?.min_age ?? 21;
  const maxAge = myPrefs?.max_age ?? 45;
  const lookingFor = myPrefs?.looking_for || "everyone";
  const wantGender =
    lookingFor === "women" ? "woman" : lookingFor === "men" ? "man" : null;

  // Everyone's age range counts until it is made a Premium feature.
  const premium = !limits.premiumAgeFilter() || (await billingService.isPremium(userId));
  const ageClause = premium
    ? "AND (p.age IS NULL OR p.age BETWEEN ? AND ?)"
    : "";
  const ageParams = premium ? [minAge, maxAge] : [];

  // Cities and "what are you looking for" from Match Filters: people who
  // fit them come first. Not a hard filter - with few members a strict one
  // would leave the deck empty.
  const cities = safeParseJson(myPrefs?.cities, []).map((c) => String(c).trim().toLowerCase()).filter(Boolean).slice(0, 10);
  const intents = safeParseJson(myPrefs?.intents, []).map((c) => String(c).trim().toLowerCase()).filter(Boolean).slice(0, 6);
  const cityClause = cities.length ? cities.map(() => "LOWER(p.city) LIKE ?").join(" OR ") : "0";
  const intentClause = intents.length ? intents.map(() => "LOWER(pi.intent) LIKE ?").join(" OR ") : "0";
  const fitParams = [...cities.map((c) => `${c}%`), ...intents.map((i) => `%${i}%`)];

  const candidates = await query(
    `SELECT
       u.id AS user_id, u.username,
       p.first_name, p.gender, p.age, p.height, p.city, p.profession,
       p.religion, p.community, p.about, p.verified, p.hobbies,
       ${billingService.blueTickSql("u.id", "p.verified")} AS blue_tick,
       EXISTS (
         SELECT 1 FROM boosts b
          WHERE b.user_id = u.id AND b.ends_at > UTC_TIMESTAMP(6)
       ) AS boosted,
       CASE
         WHEN (? IS NULL OR p.gender = ?)
          ${ageClause}
         THEN 0 ELSE 1
       END AS off_preference,
       (CASE WHEN ${cityClause} THEN 1 ELSE 0 END)
         + (CASE WHEN ${intentClause} THEN 1 ELSE 0 END) AS fits_filters
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     LEFT JOIN profile_intent pi ON pi.user_id = u.id
     WHERE u.id != ?
       AND u.deleted_at IS NULL
       AND u.deactivated_at IS NULL
       -- Never show anyone under 18, even one saved before the age check.
       AND (p.age IS NULL OR p.age >= ${MIN_AGE})
       AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
       AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
       -- Liked stays out. Passed comes back after ${PASS_RETURN_DAYS} days, a second chance.
       AND u.id NOT IN (SELECT target_id FROM match_decisions
                         WHERE actor_id = ?
                           AND (decision = 'interested'
                                OR updated_at > NOW() - INTERVAL ${PASS_RETURN_DAYS} DAY))
     ORDER BY
       boosted DESC,
       off_preference ASC,
       fits_filters DESC,
       -- Blue tick members come first among the people who fit. They pay
       -- for Pro, and they are selfie-verified, so this also puts
       -- real people at the top. They never jump above someone who fits
       -- the viewer's preferences.
       blue_tick DESC,
       (p.first_name IS NULL OR p.first_name = '') ASC,
       p.updated_at DESC,
       u.created_at DESC
     LIMIT ${Number(limit)}`,
    [wantGender, wantGender, ...ageParams, ...fitParams, userId, userId, userId, userId],
  );

  if (!candidates.length) return [];

  const candidateIds = candidates.map((c) => c.user_id);
  const placeholders = candidateIds.map(() => "?").join(",");

  const allPhotos = await query(
    `SELECT user_id, photo_url FROM profile_photos
     WHERE user_id IN (${placeholders})
     ORDER BY user_id, position ASC`,
    candidateIds,
  );
  const photosByUser = {};
  for (const row of allPhotos) {
    if (!photosByUser[row.user_id]) photosByUser[row.user_id] = [];
    photosByUser[row.user_id].push(row.photo_url);
  }

  const allVibes = await query(
    `SELECT user_id, vibe FROM profile_vibes WHERE user_id IN (${placeholders})`,
    candidateIds,
  );
  const vibesByUser = {};
  for (const row of allVibes) {
    if (!vibesByUser[row.user_id]) vibesByUser[row.user_id] = [];
    vibesByUser[row.user_id].push(row.vibe);
  }

  const allIntents = await query(
    `SELECT user_id, intent, timeline, children, family, relocation
     FROM profile_intent WHERE user_id IN (${placeholders})`,
    candidateIds,
  );
  const intentByUser = {};
  for (const row of allIntents) {
    intentByUser[row.user_id] = row;
  }

  return candidates.map((candidate) => {
    const hobbies = candidate.hobbies
      ? safeParseJson(candidate.hobbies, [])
      : [];
    const photos = photosByUser[candidate.user_id] || [];
    const vibes = vibesByUser[candidate.user_id] || [];
    const intentRow = intentByUser[candidate.user_id];
    return {
      id: candidate.user_id,
      profileId: candidate.user_id,
      matchId: candidate.user_id,
      name: candidate.first_name || candidate.username || "Member",
      age: candidate.age || 0,
      city: candidate.city || "",
      profession: candidate.profession || "",
      gender: candidate.gender || "nonbinary",
      intent: intentRow?.intent || "",
      match: "Great Match",
      verified: candidate.verified === 1,
      blueTick: Number(candidate.blue_tick) === 1,
      // Outside the viewer's stated preferences (shown only when the deck
      // would otherwise run dry). Daily picks leave these out.
      offPreference: Number(candidate.off_preference) === 1,
      vibes,
      photo: photos[0] || "",
      photos,
      about: candidate.about || "",
      hobbies,
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
    };
  });
}

module.exports = {
  getFullProfile,
  upsertProfile,
  cleanAge,
  PASS_RETURN_DAYS,
  VERIFICATION_POSES,
  issueVerificationPose,
  submitVerification,
  listPendingVerifications,
  setVerificationStatus,
  replacePhotos,
  replaceVibes,
  upsertIntent,
  upsertPreferences,
  setExperienceMode,
  markOnboardingComplete,
  findMatches,
};
