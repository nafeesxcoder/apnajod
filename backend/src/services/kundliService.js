/**
 * Kundli match: Ashtakoot Gun Milan, out of 36, from each person's Moon
 * Rashi (1-12) and Nakshatra (1-27).
 *
 *   Varna 1 · Vashya 2 · Tara 3 · Yoni 4 · Graha Maitri 5 · Gana 6 ·
 *   Bhakoot 7 · Nadi 8
 *
 * With only the Rashi of both, the four Rashi kootas are counted (out of
 * 15) and the result says it is partial. Dosha cancellations and the
 * deeper checks a pandit makes from the full birth chart are not part of
 * this - the app says so wherever the score is shown.
 *
 * Kootas that read differently for the groom and the bride (Varna, Vashya,
 * Tara, Gana, Bhakoot) use the genders when one is a man and one a woman;
 * otherwise both ways are tried and the better one is kept.
 */

const RASHIS = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
];

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
  "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
  "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati",
];

/** The Rashis a Nakshatra falls in: each has 4 padas, each Rashi 9. */
function rashisOf(nakshatra) {
  const first = (nakshatra - 1) * 4;
  const from = Math.floor(first / 9) + 1;
  const to = Math.floor((first + 3) / 9) + 1;
  return from === to ? [from] : [from, to];
}

function validPair(rashi, nakshatra) {
  if (!Number.isInteger(rashi) || rashi < 1 || rashi > 12) return false;
  if (nakshatra === null || nakshatra === undefined) return true;
  if (!Number.isInteger(nakshatra) || nakshatra < 1 || nakshatra > 27) return false;
  return rashisOf(nakshatra).includes(rashi);
}

// --- Varna (1) ---------------------------------------------------------
// Brahmin 4, Kshatriya 3, Vaishya 2, Shudra 1.
const VARNA = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4];
const varna = (boy, girl) => (VARNA[boy.rashi - 1] >= VARNA[girl.rashi - 1] ? 1 : 0);

// --- Vashya (2) --------------------------------------------------------
// 0 Chatushpad, 1 Manav, 2 Jalchar, 3 Vanchar, 4 Keet
const VASHYA_GROUP = [0, 0, 1, 2, 3, 1, 1, 4, 0, 2, 1, 2];
const VASHYA_POINTS = [
  [2, 1, 1, 0.5, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0, 0, 0, 2, 0],
  [1, 1, 1, 0, 2],
];
const vashya = (boy, girl) => VASHYA_POINTS[VASHYA_GROUP[boy.rashi - 1]][VASHYA_GROUP[girl.rashi - 1]];

// --- Tara (3) ----------------------------------------------------------
// Counting from one star to the other, 3rd, 5th and 7th (of each 9) are unlucky.
function taraGood(from, to) {
  const count = ((to - from + 27) % 27) + 1;
  return ![3, 5, 7].includes(count % 9);
}
function tara(boy, girl) {
  const good = [taraGood(girl.nakshatra, boy.nakshatra), taraGood(boy.nakshatra, girl.nakshatra)].filter(Boolean).length;
  return good === 2 ? 3 : good === 1 ? 1.5 : 0;
}

// --- Yoni (4) ----------------------------------------------------------
// 0 Horse 1 Elephant 2 Sheep 3 Serpent 4 Dog 5 Cat 6 Rat 7 Cow 8 Buffalo
// 9 Tiger 10 Deer 11 Monkey 12 Mongoose 13 Lion
const YONI_NAMES = ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion"];
const YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
const YONI_POINTS = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];
const yoni = (a, b) => YONI_POINTS[YONI[a.nakshatra - 1]][YONI[b.nakshatra - 1]];

// --- Graha Maitri (5) --------------------------------------------------
// Lords: Mars, Venus, Mercury, Moon, Sun, Mercury, Venus, Mars, Jupiter, Saturn, Saturn, Jupiter
const LORD = ["mars", "venus", "mercury", "moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn", "saturn", "jupiter"];
const FRIENDS = {
  sun: { friend: ["moon", "mars", "jupiter"], enemy: ["venus", "saturn"] },
  moon: { friend: ["sun", "mercury"], enemy: [] },
  mars: { friend: ["sun", "moon", "jupiter"], enemy: ["mercury"] },
  mercury: { friend: ["sun", "venus"], enemy: ["moon"] },
  jupiter: { friend: ["sun", "moon", "mars"], enemy: ["mercury", "venus"] },
  venus: { friend: ["mercury", "saturn"], enemy: ["sun", "moon"] },
  saturn: { friend: ["mercury", "venus"], enemy: ["sun", "moon", "mars"] },
};
function relation(of, toward) {
  if (of === toward) return "friend";
  if (FRIENDS[of].friend.includes(toward)) return "friend";
  if (FRIENDS[of].enemy.includes(toward)) return "enemy";
  return "neutral";
}
function grahaMaitri(a, b) {
  const x = LORD[a.rashi - 1];
  const y = LORD[b.rashi - 1];
  if (x === y) return 5;
  const pair = [relation(x, y), relation(y, x)].sort().join("+");
  return { "friend+friend": 5, "friend+neutral": 4, "neutral+neutral": 3, "enemy+friend": 1, "enemy+neutral": 0.5, "enemy+enemy": 0 }[pair];
}

// --- Gana (6) ----------------------------------------------------------
// 0 Deva, 1 Manushya, 2 Rakshasa
const GANA_NAMES = ["Deva", "Manushya", "Rakshasa"];
const GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
// [boy][girl]
const GANA_POINTS = [
  [6, 6, 0],
  [5, 6, 0],
  [1, 0, 6],
];
const gana = (boy, girl) => GANA_POINTS[GANA[boy.nakshatra - 1]][GANA[girl.nakshatra - 1]];

// --- Bhakoot (7) -------------------------------------------------------
// 2/12, 5/9 and 6/8 apart are the doshas.
function bhakoot(boy, girl) {
  const count = ((boy.rashi - girl.rashi + 12) % 12) + 1;
  return [2, 12, 5, 9, 6, 8].includes(count) ? 0 : 7;
}

// --- Nadi (8) ----------------------------------------------------------
// 0 Adi, 1 Madhya, 2 Antya
const NADI_NAMES = ["Adi", "Madhya", "Antya"];
const NADI = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2];
const nadi = (a, b) => (NADI[a.nakshatra - 1] === NADI[b.nakshatra - 1] ? 0 : 8);

const KOOTAS = [
  { key: "varna", name: "Varna", max: 1, needs: "rashi", score: varna, about: "Temperament and outlook" },
  { key: "vashya", name: "Vashya", max: 2, needs: "rashi", score: vashya, about: "Mutual attraction" },
  { key: "tara", name: "Tara", max: 3, needs: "nakshatra", score: tara, about: "Health and wellbeing together" },
  { key: "yoni", name: "Yoni", max: 4, needs: "nakshatra", score: yoni, about: "Physical compatibility" },
  { key: "graha_maitri", name: "Graha Maitri", max: 5, needs: "rashi", score: grahaMaitri, about: "Friendship of the mind" },
  { key: "gana", name: "Gana", max: 6, needs: "nakshatra", score: gana, about: "Nature and behaviour" },
  { key: "bhakoot", name: "Bhakoot", max: 7, needs: "rashi", score: bhakoot, about: "Family welfare and prosperity" },
  { key: "nadi", name: "Nadi", max: 8, needs: "nakshatra", score: nadi, about: "Health of the family line" },
];

/** "Excellent match · उत्तम"... from the score out of 36 (or of 15 when partial). */
function band(total, max) {
  const share = total / max;
  if (share >= 33 / 36) return { key: "excellent", label: "Excellent match", hindi: "उत्तम" };
  if (share >= 25 / 36) return { key: "very_good", label: "Very good match", hindi: "बहुत अच्छा" };
  if (share >= 18 / 36) return { key: "good", label: "Good match", hindi: "अच्छा" };
  return { key: "low", label: "Low match", hindi: "कम" };
}

function scoreAs(boy, girl, full) {
  return KOOTAS.filter((k) => full || k.needs === "rashi").map((k) => ({
    key: k.key,
    name: k.name,
    max: k.max,
    about: k.about,
    score: k.score(boy, girl),
  }));
}

const sum = (kootas) => kootas.reduce((total, k) => total + k.score, 0);

/**
 * The Gun Milan of two people, or null when either has no Rashi.
 * a and b: { rashi, nakshatra, gender }.
 */
function gunMilan(a, b) {
  if (!a?.rashi || !b?.rashi) return null;
  const full = !!(a.nakshatra && b.nakshatra);
  let kootas;
  if (a.gender === "man" && b.gender === "woman") kootas = scoreAs(a, b, full);
  else if (a.gender === "woman" && b.gender === "man") kootas = scoreAs(b, a, full);
  else {
    const one = scoreAs(a, b, full);
    const two = scoreAs(b, a, full);
    kootas = sum(one) >= sum(two) ? one : two;
  }
  const total = sum(kootas);
  const max = full ? 36 : 15;
  return { total, max, full, band: band(total, max), kootas };
}

/** Just the number for a card: { score, max, full } or null. */
function gunBadge(a, b) {
  const result = gunMilan(a, b);
  return result ? { score: result.total, max: result.max, full: result.full } : null;
}

/** A person's own details in words, for the sheet. */
function describe(person) {
  if (!person?.rashi) return null;
  return {
    rashi: RASHIS[person.rashi - 1],
    nakshatra: person.nakshatra ? NAKSHATRAS[person.nakshatra - 1] : null,
    gana: person.nakshatra ? GANA_NAMES[GANA[person.nakshatra - 1]] : null,
    nadi: person.nakshatra ? NADI_NAMES[NADI[person.nakshatra - 1]] : null,
    yoni: person.nakshatra ? YONI_NAMES[YONI[person.nakshatra - 1]] : null,
  };
}

module.exports = { RASHIS, NAKSHATRAS, rashisOf, validPair, gunMilan, gunBadge, describe, band };
