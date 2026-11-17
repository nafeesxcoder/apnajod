const { pool, query } = require("../config/db");
const { encrypt, decrypt, isEncrypted, blindIndex } = require("./fieldCrypto");

/**
 * One-time back-fill: encrypts existing phone and email values and fills the
 * blind-index columns. Run it once by hand with `npm run backfill:encrypt`.
 *
 * Idempotent: a row is picked only while a hash is missing, and an encrypted
 * value is never encrypted twice. Empty strings are left alone.
 */

const BATCH = 200;

async function backfillUsers(log = console.log) {
  let done = 0;
  for (;;) {
    const rows = await query(
      `SELECT id, phone, email FROM users
       WHERE (phone IS NOT NULL AND phone <> '' AND phone_hash IS NULL)
          OR (email IS NOT NULL AND email <> '' AND email_hash IS NULL)
       LIMIT ?`,
      [BATCH],
    );
    if (!rows.length) break;

    for (const row of rows) {
      const plainPhone = row.phone ? decrypt(row.phone) : null;
      const plainEmail = row.email ? decrypt(row.email) : null;

      const phone = plainPhone ? (isEncrypted(row.phone) ? row.phone : encrypt(plainPhone)) : row.phone;
      const email = plainEmail ? (isEncrypted(row.email) ? row.email : encrypt(plainEmail)) : row.email;

      await query(
        "UPDATE users SET phone = ?, phone_hash = ?, email = ?, email_hash = ? WHERE id = ?",
        [
          phone,
          plainPhone ? blindIndex("phone", plainPhone) : null,
          email,
          plainEmail ? blindIndex("email", plainEmail) : null,
          row.id,
        ],
      );
      done += 1;
    }
    log(`users back-filled so far: ${done}`);
  }
  return done;
}

async function run(log = console.log) {
  const users = await backfillUsers(log);
  log(`Back-fill complete. Users updated: ${users}.`);
}

module.exports = { backfillUsers };

if (require.main === module) {
  run()
    .catch((error) => {
      console.error("Back-fill failed:", error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
