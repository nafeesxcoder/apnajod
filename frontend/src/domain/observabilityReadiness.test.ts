import { describe, expect, it } from 'vitest';
import { buildObservabilityReadinessSnapshot, type ObservabilityReadinessInput } from './observabilityReadiness';

const readyInput: ObservabilityReadinessInput = {
  appEnvironment: 'production',
  telemetryAdapterReady: true,
  privacySafeEventBuilderReady: true,
  sensitiveMetadataRedactionReady: true,
  allowedEventCount: 8,
  criticalEventCount: 8,
  consentControlsReady: true,
  analyticsOptOutReady: true,
  dataRetentionPolicyReady: true,
  dataSafetyDisclosureReady: true,
  crashBoundaryReady: true,
  crashProviderConfigured: true,
  performanceMonitoringReady: true,
  dashboardReady: true,
  providerSecretsServerSide: true,
  alertOwnerReady: true,
  alertSlaMinutes: 20,
  physicalDeviceQaReady: true,
  productionLocked: true,
};

describe('observability readiness', () => {
  it('keeps preview honest when crash and analytics providers are still pending', () => {
    const snapshot = buildObservabilityReadinessSnapshot({
      ...readyInput,
      appEnvironment: 'preview',
      crashProviderConfigured: false,
      performanceMonitoringReady: false,
      dashboardReady: false,
      providerSecretsServerSide: false,
      alertOwnerReady: false,
      alertSlaMinutes: 60,
      physicalDeviceQaReady: false,
      productionLocked: false,
    });

    expect(snapshot.status).toBe('Final observability providers pending');
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'crash_capture',
      'performance_monitoring',
      'provider_security',
      'alerting_ownership',
      'production_qa',
    ]));
  });

  it('blocks setup when privacy boundaries or consent controls are missing', () => {
    const snapshot = buildObservabilityReadinessSnapshot({
      ...readyInput,
      telemetryAdapterReady: false,
      sensitiveMetadataRedactionReady: false,
      allowedEventCount: 3,
      analyticsOptOutReady: false,
      dataSafetyDisclosureReady: false,
    });

    expect(snapshot.status).toBe('Privacy telemetry setup needed');
    expect(snapshot.eventCoverage).toBe(38);
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'privacy_boundary',
      'event_taxonomy',
      'consent_retention',
    ]));
  });

  it('passes when privacy-safe analytics, crash reporting, alerts and QA are ready', () => {
    const snapshot = buildObservabilityReadinessSnapshot(readyInput);

    expect(snapshot.status).toBe('Ready for monitored launch');
    expect(snapshot.score).toBe(100);
    expect(snapshot.eventCoverage).toBe(100);
    expect(snapshot.blockerCount).toBe(0);
  });
});
