import {
  CoupleModeEvent,
  CoupleModeState,
  initialCoupleModeState,
  reduceCoupleMode,
} from '../../domain/coupleMode';

export const COUPLE_MODE_STORAGE_KEY = '@milaan/couple_mode/v1';

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type CoupleModeRepository = {
  load(): Promise<CoupleModeState>;
  save(state: CoupleModeState, expectedRevision?: number): Promise<CoupleModeState>;
  dispatch(event: CoupleModeEvent, expectedRevision?: number): Promise<CoupleModeState>;
  clear(): Promise<void>;
};

export class CoupleModeConflictError extends Error {
  constructor(expectedRevision: number, actualRevision: number) {
    super(`Couple Mode changed from revision ${expectedRevision} to ${actualRevision}. Reload before trying again.`);
    this.name = 'CoupleModeConflictError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonBlankString(value) && Number.isFinite(Date.parse(value));
}

function parseStoredState(raw: string | null): CoupleModeState {
  if (!raw) return initialCoupleModeState;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !Number.isSafeInteger(parsed.revision) || Number(parsed.revision) < 0) {
      return initialCoupleModeState;
    }
    if (parsed.experienceMode !== 'seeking' && parsed.experienceMode !== 'couple') return initialCoupleModeState;
    if (!isRecord(parsed.connection)) return initialCoupleModeState;
    const status = parsed.connection.status;
    if (!['unpaired', 'pending', 'active', 'paused'].includes(String(status))) return initialCoupleModeState;

    const connectionId = isNonBlankString(parsed.connection.connectionId) ? parsed.connection.connectionId.trim() : null;
    const partner = isRecord(parsed.connection.partner) && isNonBlankString(parsed.connection.partner.memberId) && isNonBlankString(parsed.connection.partner.displayName)
      ? { memberId: parsed.connection.partner.memberId.trim(), displayName: parsed.connection.partner.displayName.trim() }
      : null;
    const invite = isRecord(parsed.connection.invite) && isNonBlankString(parsed.connection.invite.inviteId) && isNonBlankString(parsed.connection.invite.code) && isTimestamp(parsed.connection.invite.expiresAt)
      ? { inviteId: parsed.connection.invite.inviteId.trim(), code: parsed.connection.invite.code.trim(), expiresAt: parsed.connection.invite.expiresAt }
      : null;
    const updatedAt = isTimestamp(parsed.connection.updatedAt) ? parsed.connection.updatedAt : null;

    const connectedShapeValid = (status === 'active' || status === 'paused') && connectionId && partner && !invite;
    const inviteShapeValid = status === 'pending' && !connectionId && !partner && invite;
    const emptyShapeValid = status === 'unpaired' && !connectionId && !partner && !invite;
    if (!connectedShapeValid && !inviteShapeValid && !emptyShapeValid) return initialCoupleModeState;
    if (status !== 'unpaired' && !updatedAt) return initialCoupleModeState;
    if (parsed.experienceMode === 'seeking' && status !== 'unpaired') return initialCoupleModeState;

    return {
      schemaVersion: 1,
      revision: Number(parsed.revision),
      experienceMode: parsed.experienceMode,
      connection: {
        status: status as CoupleModeState['connection']['status'],
        connectionId,
        partner,
        invite,
        updatedAt,
      },
    };
  } catch {
    return initialCoupleModeState;
  }
}

export function createLocalCoupleModeRepository(store: KeyValueStore): CoupleModeRepository {
  const load = async () => parseStoredState(await store.getItem(COUPLE_MODE_STORAGE_KEY));

  const save = async (state: CoupleModeState, expectedRevision?: number) => {
    if (expectedRevision !== undefined) {
      const current = await load();
      if (current.revision !== expectedRevision) throw new CoupleModeConflictError(expectedRevision, current.revision);
    }
    await store.setItem(COUPLE_MODE_STORAGE_KEY, JSON.stringify(state));
    return state;
  };

  return {
    load,
    save,
    async dispatch(event, expectedRevision) {
      const current = await load();
      if (expectedRevision !== undefined && current.revision !== expectedRevision) {
        throw new CoupleModeConflictError(expectedRevision, current.revision);
      }
      const next = reduceCoupleMode(current, event);
      if (next !== current) await store.setItem(COUPLE_MODE_STORAGE_KEY, JSON.stringify(next));
      return next;
    },
    async clear() {
      await store.removeItem(COUPLE_MODE_STORAGE_KEY);
    },
  };
}
