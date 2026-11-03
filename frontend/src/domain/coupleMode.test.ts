import { describe, expect, it } from 'vitest';
import {
  buildCoupleModeAccess,
  canAccessExperienceSurface,
  couplePrimaryNavigation,
  guardCoupleModeRoute,
  guardExperienceSurface,
  initialCoupleModeState,
  reduceCoupleMode,
  toCoupleModeBackendSnapshot,
  type CoupleModeState,
} from './coupleMode';

const NOW = '2026-07-15T18:00:00.000Z';
const LATER = '2026-07-15T19:00:00.000Z';
const EXPIRY = '2026-07-16T18:00:00.000Z';

function enterCoupleMode(): CoupleModeState {
  return reduceCoupleMode(initialCoupleModeState, {
    type: 'select_experience',
    mode: 'couple',
    at: NOW,
  });
}

function linkPartner(state = enterCoupleMode()): CoupleModeState {
  return reduceCoupleMode(state, {
    type: 'link_partner',
    connectionId: 'couple-1',
    partner: { memberId: 'member-2', displayName: 'Maya' },
    at: LATER,
  });
}

describe('Couple Mode access', () => {
  it('keeps matching, discovery and likes available while seeking a partner', () => {
    const access = buildCoupleModeAccess(initialCoupleModeState);

    expect(access.capabilities).toMatchObject({
      canUseMatching: true,
      canUseDiscovery: true,
      canSeeLikes: true,
      needsPartnerConnection: false,
    });
    expect(['matching', 'discover', 'likes'].every((surface) =>
      canAccessExperienceSurface(initialCoupleModeState, surface as 'matching' | 'discover' | 'likes'),
    )).toBe(true);
  });

  it('removes every matching surface and exposes only couple tools in Couple Mode', () => {
    const state = enterCoupleMode();
    const access = buildCoupleModeAccess(state);

    expect(access.hiddenSurfaces).toEqual(['matching', 'discover', 'likes']);
    expect(access.capabilities).toMatchObject({
      canUseMatching: false,
      canUseDiscovery: false,
      canSeeLikes: false,
      canOpenChat: false,
      canBrowseDates: true,
      canPlanDates: false,
      canPlayGames: false,
      needsPartnerConnection: true,
    });
    expect(couplePrimaryNavigation.map((item) => item.label)).toEqual([
      'Chat',
      'Dates',
      'Games',
      'Profile',
    ]);
    expect(couplePrimaryNavigation.some((item) =>
      ['matching', 'discover', 'likes'].includes(item.surface),
    )).toBe(false);
  });

  it('blocks direct matching routes instead of relying only on hidden navigation', () => {
    const unpaired = enterCoupleMode();

    for (const surface of ['matching', 'discover', 'likes'] as const) {
      expect(guardExperienceSurface(unpaired, surface)).toEqual({
        allowed: false,
        requested: surface,
        resolved: 'profile',
        reason: 'matching_disabled_in_couple_mode',
      });
    }

    for (const route of ['explore', 'discovery', 'detail', 'mutual', 'icebreaker', 'likes', 'executive'] as const) {
      expect(guardCoupleModeRoute(unpaired, route)).toEqual({
        allowed: false,
        requested: route,
        resolved: 'home',
        reason: 'matching_disabled_in_couple_mode',
      });
    }
  });

  it('shows couple tools before pairing but unlocks partner actions only after a secure link', () => {
    const unpaired = enterCoupleMode();
    for (const route of ['chat', 'datePlan', 'games'] as const) {
      expect(guardCoupleModeRoute(unpaired, route)).toMatchObject({
        allowed: false,
        resolved: 'profile',
        reason: 'partner_connection_required',
      });
    }
    expect(guardCoupleModeRoute(unpaired, 'events')).toMatchObject({ allowed: true, resolved: 'events' });

    const linked = linkPartner(unpaired);
    const access = buildCoupleModeAccess(linked);
    expect(access.capabilities).toMatchObject({
      canOpenChat: true,
      canBrowseDates: true,
      canPlanDates: true,
      canPlayGames: true,
      needsPartnerConnection: false,
    });
    for (const route of ['chat', 'datePlan', 'games'] as const) {
      expect(guardCoupleModeRoute(linked, route)).toMatchObject({ allowed: true, resolved: route });
    }
  });
});

describe('Couple Mode lifecycle', () => {
  it('supports invite, link, pause, resume and disconnect transitions', () => {
    const couple = enterCoupleMode();
    const pending = reduceCoupleMode(couple, {
      type: 'create_partner_invite',
      invite: { inviteId: ' invite-1 ', code: ' D1-PAIR ', expiresAt: EXPIRY },
      at: LATER,
    });
    expect(pending.connection).toMatchObject({
      status: 'pending',
      invite: { inviteId: 'invite-1', code: 'D1-PAIR', expiresAt: EXPIRY },
    });

    const linked = linkPartner(pending);
    expect(linked.connection).toEqual({
      status: 'active',
      connectionId: 'couple-1',
      partner: { memberId: 'member-2', displayName: 'Maya' },
      invite: null,
      updatedAt: LATER,
    });

    const paused = reduceCoupleMode(linked, { type: 'pause_connection', at: '2026-07-15T20:00:00.000Z' });
    expect(paused.connection.status).toBe('paused');
    expect(buildCoupleModeAccess(paused).capabilities.canOpenChat).toBe(false);

    const resumed = reduceCoupleMode(paused, { type: 'resume_connection', at: '2026-07-15T21:00:00.000Z' });
    expect(resumed.connection.status).toBe('active');

    const disconnected = reduceCoupleMode(resumed, { type: 'disconnect_partner', at: '2026-07-15T22:00:00.000Z' });
    expect(disconnected.connection).toMatchObject({
      status: 'unpaired',
      connectionId: null,
      partner: null,
      invite: null,
    });
    expect(disconnected.revision).toBe(6);
  });

  it('rejects expired invites and invalid transitions without changing revision', () => {
    const couple = enterCoupleMode();
    const expired = reduceCoupleMode(couple, {
      type: 'create_partner_invite',
      invite: { inviteId: 'invite-1', code: 'D1-PAIR', expiresAt: NOW },
      at: LATER,
    });
    expect(expired).toBe(couple);

    const resumeWhileUnpaired = reduceCoupleMode(couple, { type: 'resume_connection', at: LATER });
    expect(resumeWhileUnpaired).toBe(couple);
  });

  it('clears the partner connection when returning to the seeking experience', () => {
    const linked = linkPartner();
    const seeking = reduceCoupleMode(linked, {
      type: 'select_experience',
      mode: 'seeking',
      at: '2026-07-15T20:00:00.000Z',
    });

    expect(seeking.experienceMode).toBe('seeking');
    expect(seeking.connection).toMatchObject({
      status: 'unpaired',
      connectionId: null,
      partner: null,
      invite: null,
    });
  });

  it('creates a production-shaped backend snapshot without inventing partner data', () => {
    const snapshot = toCoupleModeBackendSnapshot(linkPartner());
    expect(snapshot).toEqual({
      schema_version: 1,
      revision: 2,
      experience_mode: 'couple',
      connection_status: 'active',
      connection_id: 'couple-1',
      partner_member_id: 'member-2',
      partner_display_name: 'Maya',
      invite_id: null,
      invite_code: null,
      invite_expires_at: null,
      updated_at: LATER,
    });
  });
});
