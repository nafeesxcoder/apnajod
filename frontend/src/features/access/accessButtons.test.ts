import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The sign-up, new-password and quick-profile screens show what is wrong with
 * a field only once `submitted` is true, and `submitted` is set inside
 * `submit()`. So a submit button that is disabled until the form is valid
 * deadlocks: the person fills something in wrong, the button goes dead, they
 * press it, nothing happens, and the message explaining why never renders
 * because the handler that would have shown it cannot run.
 *
 * That is the whole of "a normal person cannot make an account". The button
 * has to be pressable so that pressing it can say what is missing.
 *
 * This reads the source rather than rendering it: what is being checked is
 * that nobody adds `disabled` back to a submit button.
 */
const source = readFileSync('src/features/access/screens/AccessScreens.tsx', 'utf8');
const compact = (value: string) => value.replace(/\s+/g, '');

/** Every <Action> element in the file, as compacted text. */
const actions = [...source.matchAll(/<Action\b[\s\S]*?\/>/g)].map(match => match[0]);

describe('the way in', () => {
  it('found the submit buttons at all', () => {
    // Guards the regex above: if <Action> is ever renamed, the rest of this
    // file would pass by testing nothing.
    expect(actions.length).toBeGreaterThanOrEqual(6);
  });

  it('never disables a button that calls submit()', () => {
    for (const action of actions) {
      if (!action.includes('submit()')) continue;
      const label = action.match(/label=(?:"([^"]*)"|\{[^}]*\})/)?.[1] ?? action.slice(0, 60);
      expect(compact(action), `"${label}" is disabled, so it can never explain itself`)
        .not.toContain('disabled=');
    }
  });

  it('shows the person what is wrong when they press it', () => {
    // Each submit() that can refuse has to leave a message behind, not just
    // return. Checked per screen, because an early `return` with nothing set
    // is exactly the silent failure above.
    const submits = [...source.matchAll(/const submit = async \(\) => \{[\s\S]*?\n  \};/g)]
      .map(match => match[0]);
    expect(submits.length).toBeGreaterThanOrEqual(5);
    for (const body of submits) {
      const refuses = /if \([^)]*\) (return|\{)/.test(body);
      if (!refuses) continue;
      const explains =
        body.includes('setSubmitted(true)') || /set(Form)?Error\("[^"]+"\)/.test(body);
      expect(explains, `a submit() refuses without saying why:\n${body.slice(0, 200)}`)
        .toBe(true);
    }
  });

  it('keeps the sign-up form to three things', () => {
    // Mobile, username, password. The complaint that started this was a
    // sign-up long enough that people gave up part-way.
    const signUp = source.slice(
      source.indexOf('export function SignUpScreen'),
      source.indexOf('export function', source.indexOf('export function SignUpScreen') + 10),
    );
    const fields = [...signUp.matchAll(/<(AccessField|PhoneField)\b/g)];
    expect(fields).toHaveLength(3);
  });
});
