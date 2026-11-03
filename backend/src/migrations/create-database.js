/**
 * Create the database named in .env, if it does not exist yet.
 *
 * `npm run migrate` connects straight to DB_NAME, so the database has to
 * exist first. The usual way is the mysql CLI, but that is often not on PATH
 * on Windows — this does the same job with the mysql2 driver the backend
 * already depends on.
 *
 * Usage: npm run db:create
 */
const mysql = require('mysql2/promise');
const env = require('../config/env');

async function main() {
  const { host, port, user, password, database } = env.db;

  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error(
      `DB_NAME "${database}" is not a plain identifier; refusing to build SQL from it.`,
    );
  }

  let connection;
  try {
    // Connect to the server rather than to a database, which is the whole point.
    connection = await mysql.createConnection({ host, port, user, password });
  } catch (error) {
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(
        `\nMySQL refused ${user}@${host} — check DB_USER and DB_PASSWORD in backend/.env.\n` +
          `"using password: NO" in the message means DB_PASSWORD is empty.\n`,
      );
    } else if (error.code === 'ECONNREFUSED') {
      console.error(
        `\nNothing is listening on ${host}:${port}. Is the MySQL service running?\n`,
      );
    }
    throw error;
  }

  try {
    const [rows] = await connection.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
      [database],
    );
    if (rows.length) {
      console.log(`Database "${database}" already exists — nothing to do.`);
      return;
    }
    await connection.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`Created database "${database}" (utf8mb4).`);
    console.log('Next: npm run migrate');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
