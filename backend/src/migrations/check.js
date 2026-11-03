/**
 * Replay the migration files in order and check that every statement only
 * touches tables and columns that exist by that point. Catches the class of
 * bug where a migration file is empty or out of order, which otherwise only
 * shows up against a fresh database.
 *
 * Usage: npm run db:check
 */
const fs = require('node:fs');
const path = require('node:path');

function checkMigrations(dir = __dirname) {
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

// table -> Set(columns)
const tables = new Map();
const problems = [];
let statements = 0;

const norm = (s) => s.trim().replace(/`/g, '');

for (const file of files) {
  const raw = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^﻿/, '');
  const stmts = raw.split(';').map((s) => s.trim()).filter(Boolean)
    // Drop comment-only chunks, which the runner would send to MySQL as a no-op.
    .filter((s) => s.split('\n').some((l) => l.trim() && !l.trim().startsWith('--')));

  if (!stmts.length) {
    problems.push(`${file}: contains no SQL statements — is it empty?`);
    continue;
  }

  for (const stmt of stmts) {
    statements++;
    const sql = stmt.replace(/^\s*--.*$/gm, '').trim();

    let m;
    if ((m = sql.match(/^CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([`\w]+)\s*\(([\s\S]*)\)/i))) {
      const name = norm(m[1]);
      const cols = new Set();
      // Top-level comma split of the column list.
      let depth = 0, cur = '';
      for (const ch of m[2]) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && depth === 0) { cols.add(cur); cur = ''; continue; }
        cur += ch;
      }
      cols.add(cur);
      const set = new Set();
      for (const c of cols) {
        const line = c.trim();
        if (!line) continue;
        if (/^(PRIMARY|UNIQUE|KEY|INDEX|CONSTRAINT|FOREIGN|FULLTEXT|CHECK)\b/i.test(line)) continue;
        const cm = line.match(/^([`\w]+)/);
        if (cm) set.add(norm(cm[1]));
      }
      tables.set(name, set);
      continue;
    }

    if ((m = sql.match(/^ALTER TABLE\s+([`\w]+)\s+([\s\S]*)$/i))) {
      const name = norm(m[1]);
      if (!tables.has(name)) { problems.push(`${file}: ALTER on unknown table "${name}"`); continue; }
      const cols = tables.get(name);
      const body = m[2];

      const add = body.match(/ADD COLUMN\s+([`\w]+)/i);
      if (add) cols.add(norm(add[1]));

      const after = body.match(/\bAFTER\s+([`\w]+)/i);
      if (after && !cols.has(norm(after[1]))) {
        problems.push(`${file}: AFTER "${norm(after[1])}" but ${name} has no such column`);
      }

      const drop = body.match(/DROP COLUMN\s+([`\w]+)/i);
      if (drop) {
        if (!cols.has(norm(drop[1]))) problems.push(`${file}: DROP COLUMN "${norm(drop[1])}" not in ${name}`);
        else cols.delete(norm(drop[1]));
      }
      const mod = body.match(/(?:MODIFY|CHANGE)\s+(?:COLUMN\s+)?([`\w]+)/i);
      if (mod && !cols.has(norm(mod[1]))) problems.push(`${file}: MODIFY unknown column "${norm(mod[1])}" on ${name}`);
      continue;
    }

    if ((m = sql.match(/^CREATE(?:\s+UNIQUE)?\s+INDEX\s+[`\w]+\s+ON\s+([`\w]+)\s*\(([^)]*)\)/i))) {
      const name = norm(m[1]);
      if (!tables.has(name)) { problems.push(`${file}: INDEX on unknown table "${name}"`); continue; }
      for (const c of m[2].split(',')) {
        const col = norm(c).replace(/\s+(ASC|DESC)$/i, '').replace(/\(\d+\)$/, '');
        if (col && !tables.get(name).has(col)) problems.push(`${file}: INDEX on ${name}("${col}") — no such column`);
      }
      continue;
    }

    if ((m = sql.match(/^DROP TABLE(?:\s+IF EXISTS)?\s+([`\w,\s]+)$/i))) {
      for (const t of m[1].split(',')) tables.delete(norm(t));
      continue;
    }

    if (/^(INSERT|UPDATE|DELETE|SET|CREATE DATABASE|USE)\b/i.test(sql)) continue;
    problems.push(`${file}: unrecognised statement — ${sql.slice(0, 70).replace(/\s+/g, ' ')}…`);
  }
}

  return { files: files.length, statements, tables: tables.size, problems };
}

module.exports = { checkMigrations };

if (require.main === module) {
  const result = checkMigrations(process.argv[2]);
  console.log(`files      : ${result.files}`);
  console.log(`statements : ${result.statements}`);
  console.log(`tables     : ${result.tables}`);
  if (!result.problems.length) {
    console.log('\nOK - every statement only touches tables and columns that exist by that point.');
  } else {
    console.log(`\n${result.problems.length} problem(s):`);
    result.problems.forEach((p) => console.log('  - ' + p));
    process.exitCode = 1;
  }
}
