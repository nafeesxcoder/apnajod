import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * No file may switch type checking off.
 *
 * MilaanApp.tsx - the shell, the largest file in the app and the one most
 * often edited - switched checking off for the whole file. So `tsc --noEmit` passed while the
 * file called two functions it had never imported: isChatSocketConnected and
 * callApi. Both sat in the effect that answers an incoming call, so every
 * signed-in member hit a ReferenceError on load and saw the crash screen,
 * and a safety sheet was rendered without its `visible` prop and could never
 * open. A green typecheck said none of it.
 *
 * A targeted expect-error on one line is a different thing: it is checked,
 * and it fails once the error goes away. A whole-file switch only hides.
 */
function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, found);
    else if (/\.tsx?$/.test(entry)) found.push(path);
  }
  return found;
}

// Spelt at runtime so this file does not match its own check.
const pragma = ['@ts', 'nocheck'].join('-');

describe('type checking is on', () => {
  it('has no whole-file check-off anywhere in src', () => {
    const silenced = sourceFiles('src').filter((path) =>
      readFileSync(path, 'utf8').includes(pragma),
    );
    expect(silenced, `type checking is off in: ${silenced.join(', ')}`).toEqual([]);
  });

  it('keeps the app shell checked in particular', () => {
    const shell = readFileSync('src/app/MilaanApp.tsx', 'utf8');
    expect(shell).not.toContain(pragma);
    // The two names whose absence crashed the signed-in app.
    expect(shell).toContain('isChatSocketConnected,');
    expect(shell).toContain('import { callApi } from "../api/callApi";');
  });
});
