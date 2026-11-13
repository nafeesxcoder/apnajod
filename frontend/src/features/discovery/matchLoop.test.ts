import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The loop the whole app exists for: someone likes you, you accept, you talk.
 *
 * It was broken at the end rather than the start. Likes listed people with
 * nothing to press, so accepting was impossible; and the server builds the
 * conversation list out of chat_messages, so even a match that did happen
 * appeared nowhere until somebody sent a message — which neither of them
 * could do, because there was no thread to open. "Nothing shows up in Likes
 * so I can't start talking" was both halves of that at once.
 *
 * These read the source rather than render it: what is being checked is the
 * wiring between the three screens.
 */
const read = (path: string) => readFileSync(path, 'utf8');
const compact = (value: string) => value.replace(/\s+/g, '').replace(/"/g, "'");

const shell = read('src/app/MilaanApp.tsx');
const likes = read('src/features/discovery/screens/LikesScreen.tsx');
const nav = read('src/components/navigation/BottomNav.tsx');

describe('accepting someone who liked you', () => {
  it('gives every incoming like a way to say yes and no', () => {
    expect(likes).toContain('Accept');
    expect(likes).toContain('Pass');
    expect(compact(likes)).toContain("decide(like,'interested')");
    expect(compact(likes)).toContain("decide(like,'pass')");
  });

  it('accepting is liking them back, not a separate idea', () => {
    // Mutual interest is the only thing the server opens a thread for, so
    // accept has to go through the same decision the deck uses.
    expect(compact(likes)).toContain('matchApi.decide(accessToken,like.userId,decision)');
  });

  it('opens the thread the moment it is mutual', () => {
    expect(compact(likes)).toContain('result?.mutual');
    expect(compact(shell)).toContain('onMatched={(person)=>');
    expect(compact(shell)).toContain('openConversationWith({');
  });
});

describe('the Chats tab', () => {
  // The list now lives in features/social/chatTargets.ts, so "Send in chat"
  // (sharing a post) offers the same people as the Chats tab.
  const targets = read('src/features/social/chatTargets.ts').replace(/\r\n/g, '\n');

  it('lists matches nobody has written to yet', () => {
    // Without this a new match is invisible: the server's conversation list
    // is built from messages, and there are none yet.
    expect(compact(targets)).toContain('exportasyncfunctionloadChatsAndMatches(');
    expect(compact(targets)).toContain('matchApi.getMatches(token)');
    expect(compact(targets)).toContain('lastMessage:null');
    expect(shell).toContain('onLoad={() => loadChatsAndMatches(accessToken)}');
  });

  it('does not list the same person twice', () => {
    expect(compact(targets)).toContain('constalreadyListed=newSet(');
  });

  it('still shows conversations if the match list fails', () => {
    // A match list that will not load must not empty the chat list.
    expect(targets).toContain('return conversations;');
  });
});

describe('the Likes tab', () => {
  it('is marked with a heart', () => {
    // The five destinations are a data array now, so that the bottom bar
    // on a phone and the left rail on a desktop cannot drift apart. The
    // check is the same: the Likes destination carries a heart.
    const entry = nav
      .split('\n')
      .find((line) => line.includes('label: "Likes"'));
    expect(entry, 'the Likes destination should exist').toBeTruthy();
    expect(entry).toContain('heart');
  });
});
