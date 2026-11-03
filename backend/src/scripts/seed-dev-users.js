/**
 * Create a handful of signed-up members so there is someone to find.
 *
 * A fresh database has only you in it, and the Find tab is the whole point of
 * the app, so there is nothing to try. This creates real rows through the
 * same services the app uses — verified phone, hashed password, profile — and
 * skips only the SMS code, which in development is printed to the console
 * anyway.
 *
 * Development only. It refuses to run against NODE_ENV=production.
 *
 * Usage: npm run seed:dev          (adds the default six)
 *        npm run seed:dev -- 20    (adds twenty)
 */
const env = require('../config/env');
const { pool } = require('../config/db');
const userService = require('../services/userService');
const profileService = require('../services/profileService');

if (env.nodeEnv === 'production') {
  console.error('seed:dev refuses to run with NODE_ENV=production.');
  process.exit(1);
}

const PASSWORD = 'milaan123';

const PEOPLE = [
  { username: 'riya_07', name: 'Riya', gender: 'woman', age: 27, city: 'Mumbai, MH', profession: 'Product Designer' },
  { username: 'aarav_11', name: 'Aarav', gender: 'man', age: 30, city: 'Pune, MH', profession: 'Software Engineer' },
  { username: 'neha_22', name: 'Neha', gender: 'woman', age: 29, city: 'Delhi, DL', profession: 'Doctor' },
  { username: 'kabir_04', name: 'Kabir', gender: 'man', age: 32, city: 'Bengaluru, KA', profession: 'Architect' },
  { username: 'ananya_16', name: 'Ananya', gender: 'woman', age: 26, city: 'Jaipur, RJ', profession: 'Teacher' },
  { username: 'vikram_09', name: 'Vikram', gender: 'man', age: 34, city: 'Indore, MP', profession: 'Chartered Accountant' },
];

/** 98765 43210, 98765 43211, … — valid Indian mobiles that belong to nobody. */
const phoneFor = (index) => `+9198765${String(43210 + index).padStart(5, '0')}`;

async function main() {
  const wanted = Number(process.argv[2]) || PEOPLE.length;
  const passwordHash = await userService.hashPassword(PASSWORD);

  let made = 0;
  let skipped = 0;

  for (let i = 0; i < wanted; i++) {
    const base = PEOPLE[i % PEOPLE.length];
    const suffix = i < PEOPLE.length ? '' : `_${Math.floor(i / PEOPLE.length) + 1}`;
    const username = base.username + suffix;
    const phone = phoneFor(i);

    if (await userService.findUserByUsername(username)) { skipped++; continue; }
    if (await userService.findUserByPhone(phone)) { skipped++; continue; }

    const user = await userService.createUser({
      phone,
      username,
      passwordHash,
      fullName: base.name,
    });

    await profileService.upsertProfile(user.id, {
      firstName: base.name,
      gender: base.gender,
      age: base.age + (suffix ? 1 : 0),
      height: "5ft 6in",
      city: base.city,
      profession: base.profession,
      religion: null,
      community: null,
      about: 'Here to meet people properly.',
    });
    // Only members who finished onboarding are visible to anyone else.
    await profileService.markOnboardingComplete(user.id);

    made++;
    console.log(`  ${username.padEnd(14)} ${phone}`);
  }

  console.log(`\n${made} added, ${skipped} already there.`);
  if (made) console.log(`Every one of them signs in with the password: ${PASSWORD}`);
  console.log('Search any of these usernames in the Find tab.');
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
