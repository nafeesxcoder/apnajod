import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A call has to reach you, wherever you are.
 *
 * Two separate faults stopped every call, and either alone was enough:
 *
 *  1. The callee matched the call against `conversationId`, which holds the
 *     id the CALLER addressed the thread by - the callee's own user id. It
 *     was compared with conversationIdFor(match), the caller's id. Two
 *     different people, never equal, so the banner could not appear even
 *     when the callee was sitting in the right conversation.
 *
 *  2. The only thing watching for calls was a poll inside the chat screen,
 *     scoped to the one thread open on it. Anywhere else in the app nothing
 *     was listening. Push was supposed to cover that and needs VAPID keys,
 *     which are not configured, so it did nothing.
 */
const read = (path: string) => readFileSync(path, 'utf8');
const compact = (value: string) => value.replace(/\s+/g, '');

describe('an incoming call', () => {
  const chat = read('src/features/chat/ChatFeature.tsx');
  const app = read('src/app/MilaanApp.tsx');

  it('is recognised by who is calling, not by the stored conversation id', () => {
    expect(compact(chat)).toContain('call.callerId===conversationIdFor(match)');
    expect(compact(chat)).not.toContain('call.conversationId===conversationIdFor(match)');
  });

  it('is watched for from the whole app, not just the chat screen', () => {
    expect(app).toContain('"call:incoming"');
    expect(compact(app)).toContain('socket?.on("call:incoming"');
  });

  it('still has a poll for when the socket is down', () => {
    expect(compact(app)).toContain('isChatSocketConnected()');
    expect(compact(app)).toContain('callApi.getIncoming(accessToken)');
  });

  it('opens the caller\'s thread so the chat screen can ring', () => {
    const effect = app.slice(
      app.indexOf('const handledCallRef'),
      app.indexOf('const handledCallRef') + 2200,
    );
    expect(effect).toContain('openConversationWith');
    // Without this guard the same call re-opens the thread on every poll.
    expect(effect).toContain('handledCallRef.current === call.id');
  });
});
