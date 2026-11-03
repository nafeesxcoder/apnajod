/**
 * The migration files have to build a working database from nothing.
 *
 * 003_soft_delete.sql once shipped as an empty file, so `users.deleted_at` was
 * never created and 007_deactivate.sql died on "Unknown column 'deleted_at'".
 * The existing suite did not catch it because it runs against an in-memory
 * stand-in rather than replaying the SQL, so nobody noticed until someone set
 * up a fresh MySQL.
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { checkMigrations } = require('../src/migrations/check');

const migrationsDir = path.join(__dirname, '..', 'src', 'migrations');

test('every migration only touches tables and columns that exist by then', () => {
  const { problems } = checkMigrations(migrationsDir);
  assert.deepStrictEqual(
    problems,
    [],
    `migrations are not self-consistent:\n  ${problems.join('\n  ')}`,
  );
});

test('no migration file is empty', () => {
  const { problems } = checkMigrations(migrationsDir);
  const empties = problems.filter((p) => p.includes('no SQL statements'));
  assert.deepStrictEqual(empties, []);
});

test('the schema a fresh database ends up with covers soft delete', () => {
  const { problems, tables, statements } = checkMigrations(migrationsDir);
  assert.strictEqual(problems.length, 0);
  assert.ok(tables > 0, 'expected the migrations to create tables');
  assert.ok(statements > 0, 'expected the migrations to contain statements');
});
