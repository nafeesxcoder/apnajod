import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The Likes tab is a record, not an inbox that empties itself.
 *
 * An accepted like used to disappear from the list the instant it was
 * accepted, so the single best thing that can happen on a dating app left
 * no trace that it had happened. And each row was a name over a grey
 * rectangle: nothing to decide from, on the screen that exists for
 * deciding.
 */
const read = (path: string) => readFileSync(path, 'utf8');
const compact = (value: string) => value.replace(/\s+/g, '');

describe('the likes list', () => {
  const screen = read('src/features/discovery/screens/LikesScreen.tsx');

  it('keeps an accepted like in the list, marked accepted', () => {
    expect(compact(screen)).toContain('status:"accepted"');
    expect(screen).toContain('Accepted');
    expect(screen).toContain('Pending');
  });

  it('only removes someone when they are passed on', () => {
    const decide = screen.slice(
      screen.indexOf('const decide ='),
      screen.indexOf('/** Open the thread'),
    );
    // The filter that drops a row must sit under the "pass" branch.
    const passBranch = decide.slice(decide.indexOf('if (decision === "pass")'));
    expect(passBranch).toContain('current.filter');
    expect(decide.slice(0, decide.indexOf('if (decision === "pass")'))).not.toContain(
      'current.filter',
    );
  });

  it('goes straight into the chat when accepting makes it mutual', () => {
    expect(compact(screen)).toContain('if(result?.mutual)');
    expect(screen).toContain('onMatched(');
  });

  it('offers Message, not Accept, to someone already accepted', () => {
    expect(compact(screen)).toContain('accepted?(');
    expect(screen).toContain('openChat(like)');
  });

  it('shows enough of the person to decide on', () => {
    for (const field of ['like.photo', 'like.about', 'like.age', 'like.city', 'like.verified']) {
      expect(screen, `${field} is not shown`).toContain(field);
    }
  });

  it('carries the full profile into the detail screen', () => {
    // It used to build a bare stub with an inline require(), so opening
    // someone who liked you showed a name and nothing else.
    expect(screen).toContain('function matchFromLike');
    expect(screen).not.toContain('require("../../../domain/socialMatch")');
    const builder = screen.slice(
      screen.indexOf('function matchFromLike'),
      screen.indexOf('/** "2 hours ago"'),
    );
    for (const field of ['about', 'photos', 'verified', 'hobbies']) {
      expect(builder, `${field} is dropped on the way to the detail screen`).toContain(
        field,
      );
    }
  });
});

describe('a person page', () => {
  const person = read('src/features/social/screens/PersonScreen.tsx');

  it('shows the profile, not a username and two zeroes', () => {
    for (const field of ['profile.about', 'profile.photos', 'profile.age', 'profile.city']) {
      expect(person, `${field} is not shown`).toContain(field);
    }
    // The follower counts belonged to the follow system this app dropped.
    expect(person).not.toContain('personMetaValue');
  });

  it('offers exactly one action, chosen by where the like stands', () => {
    expect(person).toContain('likeStatus === "accepted"');
    expect(person).toContain('likeStatus === "pending"');
    expect(person).toContain('likes_you');
    // No Like button once matched: that is the state that confuses people.
    const actions = person.slice(
      person.indexOf('{!state.self && ('),
      person.indexOf('{!!profile.about && ('),
    );
    const matchedBranch = actions.slice(0, actions.indexOf('likeStatus === "pending"'));
    expect(matchedBranch).toContain('Message');
    expect(matchedBranch).not.toContain('"Like"');
  });

  it('opens the chat the moment accepting makes it mutual', () => {
    const like = person.slice(person.indexOf('const like = async'), person.indexOf('if (error && !page)'));
    expect(like).toContain('onMessage(');
    expect(like).toContain('matched');
  });
});
