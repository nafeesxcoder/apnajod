export type BackendLaunchStatus = 'Ready for production backend' | 'Final provider connections pending' | 'Backend setup needed';

export type BackendLaunchGateId =
  | 'client_config'
  | 'auth_providers'
  | 'schema_migrations'
  | 'rls_security'
  | 'realtime_persistence'
  | 'storage_media'
  | 'edge_functions'
  | 'secrets_environment'
  | 'backup_monitoring';

export type BackendLaunchInput = {
  backendMode: 'demo' | 'aws' | 'missing' | string;
  appEnvironment: string;
  requiresRealBackend: boolean;
  apiConfigured: boolean;
  migrationCount: number;
  edgeFunctionCount: number;
  dataModuleCount: number;
  backendReadyModuleCount: number;
  realtimeModuleCount: number;
  providerModuleCount: number;
  authAdapterReady: boolean;
  emailOtpReady: boolean;
  phoneOtpProviderReady: boolean;
  databaseTypesReady: boolean;
  hostedSchemaVerified: boolean;
  migrationHistoryAligned: boolean;
  databaseTestsPassed: boolean;
  rlsPoliciesReady: boolean;
  storageBucketsReady: boolean;
  realtimePersistenceReady: boolean;
  edgeFunctionsReady: boolean;
  serverSecretsReady: boolean;
  productionEnvLocked: boolean;
  backupMonitoringReady: boolean;
};

export type BackendLaunchGate = {
  id: BackendLaunchGateId;
  title: string;
  body: string;
  ready: boolean;
  started: boolean;
  nextStep: string;
};

export type BackendLaunchSnapshot = {
  status: BackendLaunchStatus;
  score: number;
  readyCount: number;
  total: number;
  schemaCoverage: number;
  providerModules: number;
  realtimeModules: number;
  blockers: BackendLaunchGate[];
  gates: BackendLaunchGate[];
  nextBestStep: string;
};

function gateScore(gate: BackendLaunchGate) {
  if (gate.ready) return 100;
  if (gate.started) return 55;
  return 0;
}

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

export function buildBackendLaunchSnapshot(input: BackendLaunchInput): BackendLaunchSnapshot {
  const backendConnected = input.backendMode === 'aws' && input.apiConfigured;
  const productionReadyConfig = backendConnected &&
    (!input.requiresRealBackend || input.productionEnvLocked) &&
    input.appEnvironment !== 'production' || (
      backendConnected &&
      input.requiresRealBackend &&
      input.productionEnvLocked
    );
  const authReady = backendConnected && input.authAdapterReady && input.emailOtpReady && input.phoneOtpProviderReady;
  const schemaCoverage = percent(input.backendReadyModuleCount, input.dataModuleCount);
  const schemaReady = input.migrationCount >= 17 &&
    input.databaseTypesReady &&
    input.hostedSchemaVerified &&
    input.migrationHistoryAligned &&
    input.databaseTestsPassed &&
    schemaCoverage >= 95;
  const rlsReady = schemaReady && input.rlsPoliciesReady;
  const realtimeReady = input.realtimePersistenceReady && input.realtimeModuleCount >= 7;
  const edgeReady = input.edgeFunctionCount >= 4 && input.edgeFunctionsReady;
  const secretsReady = input.serverSecretsReady && input.productionEnvLocked && (input.requiresRealBackend || input.appEnvironment === 'production');

  const gates: BackendLaunchGate[] = [
    {
      id: 'client_config',
      title: 'Client backend config',
      body: backendConnected
        ? `${input.backendMode} mode is configured for ${input.appEnvironment}. Production lock ${input.productionEnvLocked ? 'enabled' : 'not enabled yet'}.`
        : 'The AWS API base URL and authenticated client adapter are not connected.',
      ready: productionReadyConfig,
      started: backendConnected,
      nextStep: 'Set production environment variables and require real backend for release builds.',
    },
    {
      id: 'auth_providers',
      title: 'Auth providers',
      body: authReady
        ? 'Email OTP and phone OTP provider are ready for production authentication.'
        : `Auth adapter ${input.authAdapterReady ? 'ready' : 'missing'} · email OTP ${input.emailOtpReady ? 'ready' : 'pending'} · phone/SMS provider ${input.phoneOtpProviderReady ? 'ready' : 'pending'}.`,
      ready: authReady,
      started: backendConnected && input.authAdapterReady,
      nextStep: 'Connect Amazon Cognito email and SMS verification through the typed auth port.',
    },
    {
      id: 'schema_migrations',
      title: 'Schema and generated types',
      body: `${input.migrationCount} migration(s) · ${schemaCoverage}% source coverage · hosted schema ${input.hostedSchemaVerified ? 'verified' : 'not verified'} · migration history ${input.migrationHistoryAligned ? 'aligned' : 'not aligned'} · database tests ${input.databaseTestsPassed ? 'passed' : 'not run on target'}.`,
      ready: schemaReady,
      started: input.migrationCount > 0,
      nextStep: 'Review the existing hosted baseline, align migration history, run database tests, then verify every required table and RPC.',
    },
    {
      id: 'rls_security',
      title: 'RLS and security policies',
      body: input.rlsPoliciesReady
        ? 'Core tables use Row Level Security and user-scoped policies.'
        : 'Production cannot trust client keys without RLS on user, match, chat, safety and billing tables.',
      ready: rlsReady,
      started: input.rlsPoliciesReady,
      nextStep: 'Audit every table/storage bucket with authenticated user policies and blocked-member checks.',
    },
    {
      id: 'realtime_persistence',
      title: 'Realtime persistence',
      body: `${input.realtimeModuleCount} realtime module(s) modeled for chat, notifications, safety, dates and support.`,
      ready: realtimeReady,
      started: input.realtimePersistenceReady,
      nextStep: 'Verify realtime subscriptions on physical devices for mutual-match chat, notifications and support updates.',
    },
    {
      id: 'storage_media',
      title: 'Private storage/media',
      body: input.storageBucketsReady
        ? 'Profile media and chat media upload paths are backend-ready; signed reads still need production checks.'
        : 'Private profile/chat storage buckets and signed URL reads must be configured.',
      ready: input.storageBucketsReady,
      started: input.storageBucketsReady,
      nextStep: 'Create private storage buckets, moderation approval rules and short-lived signed URL reads.',
    },
    {
      id: 'edge_functions',
      title: 'Edge Functions',
      body: `${input.edgeFunctionCount} Edge Function(s) present for privileged payment actions.`,
      ready: edgeReady,
      started: input.edgeFunctionCount > 0,
      nextStep: 'Deploy Edge Functions with service-role secrets for date reservations and future moderation jobs.',
    },
    {
      id: 'secrets_environment',
      title: 'Secrets and environment lock',
      body: secretsReady
        ? 'Server secrets are kept out of the app and production builds require real backend mode.'
        : 'Payment, push, SMS and privileged credentials must live only in AWS server configuration.',
      ready: secretsReady,
      started: input.productionEnvLocked || input.serverSecretsReady,
      nextStep: 'Store privileged values in AWS Secrets Manager and lock production builds to the live API adapter.',
    },
    {
      id: 'backup_monitoring',
      title: 'Backup and monitoring',
      body: input.backupMonitoringReady
        ? 'Backups, logs, error alerts and launch monitoring are ready.'
        : 'Launch needs database backups, error alerts, auth delivery monitoring, webhook logs and support dashboards.',
      ready: input.backupMonitoringReady,
      started: false,
      nextStep: 'Enable AWS database backups, centralized logs, alerts, webhook tracing and clear operational ownership.',
    },
  ];

  const blockers = gates.filter((gate) => !gate.ready);
  const readyCount = gates.length - blockers.length;
  const score = Math.round(gates.reduce((sum, gate) => sum + gateScore(gate), 0) / gates.length);
  const setupBlockerIds: BackendLaunchGateId[] = ['client_config', 'schema_migrations', 'rls_security', 'realtime_persistence', 'storage_media', 'edge_functions'];
  const hasSetupBlocker = blockers.some((gate) => setupBlockerIds.includes(gate.id));

  return {
    status: blockers.length === 0 ? 'Ready for production backend' : hasSetupBlocker ? 'Backend setup needed' : 'Final provider connections pending',
    score,
    readyCount,
    total: gates.length,
    schemaCoverage,
    providerModules: input.providerModuleCount,
    realtimeModules: input.realtimeModuleCount,
    blockers,
    gates,
    nextBestStep: blockers[0]?.nextStep ?? 'Run production smoke tests with real auth, RLS, realtime, storage and Edge Functions.',
  };
}
