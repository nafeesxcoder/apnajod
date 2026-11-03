type BackendRuntimeMode = 'demo'|'aws'|'blocked';

export type MemberDataRuntimePolicy = {
  source: 'preview' | 'server';
  allowsLocalHydration: boolean;
  allowsLocalPersistence: boolean;
  allowsMockMatches: boolean;
  initialCoinBalance: number;
};

export type MemberMutationResult = {
  saved: boolean;
  reason: 'backend' | 'preview_id' | 'demo' | 'error';
  error?: string;
};

/**
 * What the app may do with member data.
 *
 * `mode` describes the build; `hasSession` describes the person. A signed-in
 * member is always on the server, whatever the build says — the demo mode is
 * for the signed-out showcase. Reading it from the build alone meant a real
 * member's messages were kept in local state and never sent, so they
 * vanished the moment they left the thread.
 */
export function evaluateMemberDataRuntime(
  mode: BackendRuntimeMode,
  hasSession = false,
): MemberDataRuntimePolicy {
  const isPreview = mode === 'demo' && !hasSession;
  return {
    source: isPreview ? 'preview' : 'server',
    allowsLocalHydration: isPreview,
    allowsLocalPersistence: isPreview,
    allowsMockMatches: isPreview,
    initialCoinBalance: isPreview ? 500 : 0,
  };
}

export function canCommitMemberMutation(policy: MemberDataRuntimePolicy, result: MemberMutationResult) {
  if (policy.source === 'preview') return true;
  return result.saved && result.reason === 'backend';
}

export function memberMutationFailureMessage(result: MemberMutationResult, fallback: string) {
  if (result.reason === 'error' && result.error) return result.error;
  if (result.reason === 'preview_id') return 'This action is not linked to a verified member record.';
  if (result.reason === 'demo') return 'The secure server did not confirm this action.';
  return fallback;
}
