const test = require("node:test");
const assert = require("node:assert");
const k = require("../src/services/kundliService.js");

/** Gun Milan (Ashtakoot, 36) from Moon Rashi and Nakshatra. */
const person = (rashi, nakshatra, gender) => ({ rashi, nakshatra, gender });

test("each Nakshatra sits in the right Rashi", () => {
  assert.deepStrictEqual(k.rashisOf(1), [1]); // Ashwini: Mesha
  assert.deepStrictEqual(k.rashisOf(3), [1, 2]); // Krittika: Mesha and Vrishabha
  assert.deepStrictEqual(k.rashisOf(27), [12]); // Revati: Meena
  assert.strictEqual(k.validPair(2, 4), true); // Vrishabha, Rohini
  assert.strictEqual(k.validPair(1, 4), false); // Mesha, Rohini: no
  assert.strictEqual(k.validPair(5, null), true); // Rashi alone is fine
});

test("the eight kootas add up to 36 at most", () => {
  let best = 0;
  for (let n1 = 1; n1 <= 27; n1 += 1) {
    for (let n2 = 1; n2 <= 27; n2 += 1) {
      const a = person(k.rashisOf(n1)[0], n1, "man");
      const b = person(k.rashisOf(n2)[0], n2, "woman");
      const r = k.gunMilan(a, b);
      assert.ok(r.total >= 0 && r.total <= 36);
      assert.strictEqual(r.kootas.length, 8);
      best = Math.max(best, r.total);
    }
  }
  assert.ok(best >= 33, "some pairs are excellent");
});

test("the same Nakshatra gives 28: everything but Nadi", () => {
  const r = k.gunMilan(person(1, 1, "man"), person(1, 1, "woman"));
  assert.strictEqual(r.total, 28);
  assert.strictEqual(r.kootas.find((x) => x.key === "nadi").score, 0);
  assert.strictEqual(r.band.key, "very_good");
});

test("known pair: Rohini man with Uttara Phalguni (Kanya) woman", () => {
  // Varna V/V 1, Vashya Chat/Manav 1, Tara 3 (counts 20 and 9, both lucky), Yoni Serpent-Cow 1,
  // Graha Maitri Venus-Mercury friends 5, Gana Manushya both 6, Bhakoot 2..6 -> 5/9 dosha 0,
  // Nadi Antya-Adi 8.
  const r = k.gunMilan(person(2, 4, "man"), person(6, 12, "woman"));
  const by = Object.fromEntries(r.kootas.map((x) => [x.key, x.score]));
  assert.deepStrictEqual(by, { varna: 1, vashya: 1, tara: 3, yoni: 1, graha_maitri: 5, gana: 6, bhakoot: 0, nadi: 8 });
  assert.strictEqual(r.total, 25);
  // Counted 3 apart: Tara drops to 1.5 (Bharani man, Rohini woman: 25 and 3).
  const t = k.gunMilan(person(1, 2, "man"), person(2, 4, "woman")).kootas.find((x) => x.key === "tara");
  assert.strictEqual(t.score, 1.5);
});

test("Rashi alone: the four Rashi kootas, out of 15", () => {
  const r = k.gunMilan(person(1, null, "man"), person(5, null, "woman"));
  assert.strictEqual(r.full, false);
  assert.strictEqual(r.max, 15);
  assert.deepStrictEqual(r.kootas.map((x) => x.key), ["varna", "vashya", "graha_maitri", "bhakoot"]);
});

test("no Rashi on either side: no score at all", () => {
  assert.strictEqual(k.gunMilan(person(null, null), person(3, 7)), null);
  assert.strictEqual(k.gunBadge(person(3, 7), {}), null);
});

test("it reads the same whichever side asks", () => {
  const a = person(4, 8, "woman");
  const b = person(9, 19, "man");
  assert.strictEqual(k.gunMilan(a, b).total, k.gunMilan(b, a).total);
  const c = person(4, 8, "man");
  const d = person(9, 19, "man");
  assert.strictEqual(k.gunMilan(c, d).total, k.gunMilan(d, c).total);
});
