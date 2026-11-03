import { describe, expect, it } from 'vitest';
import { buildBackendLaunchSnapshot, type BackendLaunchInput } from './backendReadiness';

const readyInput: BackendLaunchInput = {
  backendMode: 'aws',
  appEnvironment: 'production',
  requiresRealBackend: true,
  apiConfigured: true,
  migrationCount: 17,
  edgeFunctionCount: 4,
  dataModuleCount: 15,
  backendReadyModuleCount: 15,
  realtimeModuleCount: 8,
  providerModuleCount: 8,
  authAdapterReady: true,
  emailOtpReady: true,
  phoneOtpProviderReady: true,
  databaseTypesReady: true,
  hostedSchemaVerified: true,
  migrationHistoryAligned: true,
  databaseTestsPassed: true,
  rlsPoliciesReady: true,
  storageBucketsReady: true,
  realtimePersistenceReady: true,
  edgeFunctionsReady: true,
  serverSecretsReady: true,
  productionEnvLocked: true,
  backupMonitoringReady: true,
};

describe('backend launch readiness', () => {
  it('blocks production when the AWS API is not configured', () => {
    const snapshot = buildBackendLaunchSnapshot({
      ...readyInput,
      backendMode: 'missing',
      apiConfigured: false,
    });

    expect(snapshot.status).toBe('Backend setup needed');
    expect(snapshot.blockers.map((gate) => gate.id)).toContain('client_config');
  });

  it('separates schema readiness from final provider/secrets work', () => {
    const snapshot = buildBackendLaunchSnapshot({
      ...readyInput,
      appEnvironment: 'development',
      requiresRealBackend: false,
      phoneOtpProviderReady: false,
      serverSecretsReady: false,
      productionEnvLocked: false,
      backupMonitoringReady: false,
    });

    expect(snapshot.status).toBe('Final provider connections pending');
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual([
      'auth_providers',
      'secrets_environment',
      'backup_monitoring',
    ]);
  });

  it('does not treat source migrations as a deployed production schema', () => {
    const snapshot = buildBackendLaunchSnapshot({
      ...readyInput,
      hostedSchemaVerified: false,
      migrationHistoryAligned: false,
      databaseTestsPassed: false,
    });

    expect(snapshot.status).toBe('Backend setup needed');
    expect(snapshot.blockers.map((gate) => gate.id)).toContain('schema_migrations');
  });

  it('passes when auth, migrations, RLS, realtime, storage, functions, secrets and monitoring are ready', () => {
    const snapshot = buildBackendLaunchSnapshot(readyInput);

    expect(snapshot.status).toBe('Ready for production backend');
    expect(snapshot.score).toBe(100);
    expect(snapshot.blockers).toEqual([]);
  });
});
