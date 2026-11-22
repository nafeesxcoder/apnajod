import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A call has to reach you, wherever you are, and must not move you.
 *
 * An incoming call is handled by IncomingCallHost, mounted once at the app
 * root. It rings and shows the banner on whatever screen is open. It used to
 * open the caller's chat thread on arrival, which pulled people away from
 * Home mid-call; that redirect is gone.
 */
const read = (path: string) => readFileSync(path, 'utf8');
const compact = (value: string) => value.replace(/\s+/g, '');

describe('an incoming call', () => {
  const host = read('src/features/chat/IncomingCallHost.tsx');
  const app = read('src/app/MilaanApp.tsx');

  it('is shown from the app root, on any screen', () => {
    expect(app).toContain('<IncomingCallHost accessToken={accessToken} />');
  });

  it('is watched for over the socket and by a poll', () => {
    expect(host).toContain('"call:incoming"');
    expect(compact(host)).toContain('callApi.getIncoming(accessToken)');
    expect(compact(host)).toContain('setInterval(check,3000)');
  });

  it('does not redirect to the caller\'s chat thread', () => {
    expect(app).not.toContain('handledCallRef');
    expect(app).not.toContain('"call:incoming"');
  });

  it('rings once per call, not again on every poll', () => {
    expect(compact(host)).toContain('[incomingId,busy]');
    expect(compact(host)).toContain('current?.id===call.id?current');
  });
});
