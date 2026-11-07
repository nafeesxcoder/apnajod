import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CHAT_LIST_WIDTH, RAIL_WIDTH } from '../../layout/breakpoints';

/**
 * On a desktop, chat is a list beside a thread.
 *
 * Three things have to agree or the panes overlap, and each one was wrong
 * at some point while this was built:
 *
 *  - the list pane holds the nav rail rather than sitting beside it,
 *    because the rail is drawn by the list screen's own BottomNav. A pane
 *    starting at RAIL_WIDTH put the rail inside the list and clipped the
 *    avatar and the first half of every name.
 *  - the thread starts where the pane ends.
 *  - the thread's 820px cap, which is right for a single centred column,
 *    is lifted - otherwise the cap is spent on the left padding and the
 *    thread ends up 380px wide, adrift in the middle of the window.
 */
const read = (path: string) => readFileSync(path, 'utf8');

describe('chat on a desktop', () => {
  const list = read('src/features/social/screens/ChatsScreen.tsx');
  const thread = read('src/features/chat/ChatFeature.tsx');
  const shell = read('src/app/MilaanApp.tsx');

  it('keeps the list on screen while a thread is open', () => {
    expect(shell).toContain('appLayout.isDesktop && screen === "chat"');
    expect(shell).toContain('pane={appLayout.isDesktop && screen === "chat"}');
  });

  it('says which conversation is open', () => {
    expect(shell).toContain('activeConversationId');
    expect(list).toContain('conversation.conversationId === activeConversationId');
  });

  it('puts the rail inside the pane, not beside it', () => {
    expect(list).toContain('width: RAIL_WIDTH + CHAT_LIST_WIDTH');
    expect(list).toContain('left: 0,');
  });

  it('starts the thread where the pane ends', () => {
    expect(thread).toContain('paddingLeft: RAIL_WIDTH + CHAT_LIST_WIDTH');
  });

  it('lifts the single-column width cap beside the list', () => {
    // `maxWidth: undefined` does not override a merged style on
    // react-native-web, so the cap has to be replaced with a real number.
    expect(thread).toContain('maxWidth: APP_MAX_WIDTH');
    expect(thread).not.toContain('maxWidth: undefined');
  });

  it('leaves a usable thread beside the list on the smallest desktop', () => {
    // 1024 is where the two-pane layout turns on.
    expect(1024 - (RAIL_WIDTH + CHAT_LIST_WIDTH)).toBeGreaterThan(500);
  });
});
