import { describe, expect, it } from 'vitest';
import { initialCoupleModeState, reduceCoupleMode, type CoupleModeState } from '../../domain/coupleMode';
import {
  COUPLE_MODE_STORAGE_KEY,
  CoupleModeConflictError,
  createLocalCoupleModeRepository,
  type KeyValueStore,
} from './localCoupleModeRepository';

function createMemoryStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const store: KeyValueStore = {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
  return { store, values };
}

function linkedCoupleState(): CoupleModeState {
  const couple = reduceCoupleMode(initialCoupleModeState, {
    type: 'select_experience',
    mode: 'couple',
    at: '2026-07-15T18:00:00.000Z',
  });
  return reduceCoupleMode(couple, {
    type: 'link_partner',
    connectionId: 'couple-1',
    partner: { memberId: 'member-2', displayName: 'Maya' },
    at: '2026-07-15T19:00:00.000Z',
  });
}

describe('local Couple Mode repository', () => {
  it('persists Couple Mode across repository instances', async () => {
    const memory = createMemoryStore();
    const firstSession = createLocalCoupleModeRepository(memory.store);
    const selected = await firstSession.dispatch({
      type: 'select_experience',
      mode: 'couple',
      at: '2026-07-15T18:00:00.000Z',
    });
    const linked = await firstSession.dispatch({
      type: 'link_partner',
      connectionId: 'couple-1',
      partner: { memberId: 'member-2', displayName: 'Maya' },
      at: '2026-07-15T19:00:00.000Z',
    }, selected.revision);

    const nextSession = createLocalCoupleModeRepository(memory.store);
    await expect(nextSession.load()).resolves.toEqual(linked);
    expect(memory.values.has(COUPLE_MODE_STORAGE_KEY)).toBe(true);
  });

  it('returns the safe default for missing, malformed, future-schema and impossible records', async () => {
    const invalidRecords = [
      null,
      '{not-json',
      JSON.stringify({ ...linkedCoupleState(), schemaVersion: 2 }),
      JSON.stringify({
        ...linkedCoupleState(),
        connection: { status: 'active', connectionId: null, partner: null, invite: null, updatedAt: null },
      }),
    ];

    for (const raw of invalidRecords) {
      const memory = createMemoryStore(raw === null ? {} : { [COUPLE_MODE_STORAGE_KEY]: raw });
      const repository = createLocalCoupleModeRepository(memory.store);
      await expect(repository.load()).resolves.toEqual(initialCoupleModeState);
    }
  });

  it('prevents stale callers from overwriting a newer partner state', async () => {
    const memory = createMemoryStore();
    const repository = createLocalCoupleModeRepository(memory.store);
    const couple = await repository.dispatch({
      type: 'select_experience',
      mode: 'couple',
      at: '2026-07-15T18:00:00.000Z',
    });
    await repository.dispatch({
      type: 'create_partner_invite',
      invite: {
        inviteId: 'invite-1',
        code: 'D1-PAIR',
        expiresAt: '2026-07-16T18:00:00.000Z',
      },
      at: '2026-07-15T19:00:00.000Z',
    }, couple.revision);

    await expect(repository.dispatch(
      { type: 'cancel_partner_invite', at: '2026-07-15T20:00:00.000Z' },
      couple.revision,
    )).rejects.toBeInstanceOf(CoupleModeConflictError);
  });

  it('does not write invalid transitions and clears the persisted experience', async () => {
    const memory = createMemoryStore();
    const repository = createLocalCoupleModeRepository(memory.store);

    await repository.dispatch({ type: 'resume_connection', at: '2026-07-15T18:00:00.000Z' });
    expect(memory.values.has(COUPLE_MODE_STORAGE_KEY)).toBe(false);

    await repository.save(linkedCoupleState());
    expect(memory.values.has(COUPLE_MODE_STORAGE_KEY)).toBe(true);
    await repository.clear();
    await expect(repository.load()).resolves.toEqual(initialCoupleModeState);
  });
});
