import { describe, expect, it } from 'vitest';

import { canCommitMemberMutation, evaluateMemberDataRuntime } from './memberDataRuntime';

describe('member data runtime policy', () => {
  it('treats a signed-out visitor in a demo build as preview', () => {
    const policy = evaluateMemberDataRuntime('demo', false);
    expect(policy.source).toBe('preview');
    expect(policy.allowsMockMatches).toBe(true);
    expect(policy.allowsLocalPersistence).toBe(true);
  });

  it('treats a signed-in member as server, even in a demo build', () => {
    // This is the bug that lost people's messages: the build said demo, so a
    // real member's chat was kept in local state and never sent.
    const policy = evaluateMemberDataRuntime('demo', true);
    expect(policy.source).toBe('server');
    expect(policy.allowsMockMatches).toBe(false);
    expect(policy.allowsLocalPersistence).toBe(false);
  });

  it('is always server against a real backend', () => {
    expect(evaluateMemberDataRuntime('aws', false).source).toBe('server');
    expect(evaluateMemberDataRuntime('aws', true).source).toBe('server');
  });

  it('requires the server to confirm a signed-in member write', () => {
    const policy = evaluateMemberDataRuntime('demo', true);
    expect(canCommitMemberMutation(policy, { saved: true, reason: 'backend' })).toBe(true);
    expect(canCommitMemberMutation(policy, { saved: false, reason: 'error' })).toBe(false);
    expect(canCommitMemberMutation(policy, { saved: true, reason: 'demo' })).toBe(false);
  });

  it('lets the signed-out preview commit locally', () => {
    const policy = evaluateMemberDataRuntime('demo', false);
    expect(canCommitMemberMutation(policy, { saved: false, reason: 'demo' })).toBe(true);
  });
});
