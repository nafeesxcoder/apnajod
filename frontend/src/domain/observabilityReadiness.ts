export type ObservabilityLaunchStatus =
  | 'Ready for monitored launch'
  | 'Final observability providers pending'
  | 'Privacy telemetry setup needed';

export type ObservabilityGateId =
  | 'privacy_boundary'
  | 'event_taxonomy'
  | 'consent_retention'
  | 'crash_capture'
  | 'performance_monitoring'
  | 'provider_security'
  | 'alerting_ownership'
  | 'production_qa';

export type ObservabilityReadinessInput = {
  appEnvironment: string;
  telemetryAdapterReady: boolean;
  privacySafeEventBuilderReady: boolean;
  sensitiveMetadataRedactionReady: boolean;
  allowedEventCount: number;
  criticalEventCount: number;
  consentControlsReady: boolean;
  analyticsOptOutReady: boolean;
  dataRetentionPolicyReady: boolean;
  dataSafetyDisclosureReady: boolean;
  crashBoundaryReady: boolean;
  crashProviderConfigured: boolean;
  performanceMonitoringReady: boolean;
  dashboardReady: boolean;
  providerSecretsServerSide: boolean;
  alertOwnerReady: boolean;
  alertSlaMinutes: number;
  physicalDeviceQaReady: boolean;
  productionLocked: boolean;
};

export type ObservabilityGate = {
  id: ObservabilityGateId;
  title: string;
  body: string;
  ready: boolean;
  started: boolean;
  nextStep: string;
};

export type ObservabilityReadinessSnapshot = {
  status: ObservabilityLaunchStatus;
  score: number;
  readyCount: number;
  total: number;
  eventCoverage: number;
  blockerCount: number;
  blockers: ObservabilityGate[];
  gates: ObservabilityGate[];
  nextBestStep: string;
};

function gateScore(gate: ObservabilityGate) {
  if (gate.ready) return 100;
  if (gate.started) return 55;
  return 0;
}

export function buildObservabilityReadinessSnapshot(input: ObservabilityReadinessInput): ObservabilityReadinessSnapshot {
  const privacyBoundaryReady = input.telemetryAdapterReady &&
    input.privacySafeEventBuilderReady &&
    input.sensitiveMetadataRedactionReady;
  const eventCoverage = input.criticalEventCount ? Math.round((input.allowedEventCount / input.criticalEventCount) * 100) : 0;
  const eventTaxonomyReady = input.allowedEventCount >= input.criticalEventCount && input.criticalEventCount >= 8;
  const consentRetentionReady = input.consentControlsReady &&
    input.analyticsOptOutReady &&
    input.dataRetentionPolicyReady &&
    input.dataSafetyDisclosureReady;
  const crashReady = input.crashBoundaryReady && input.crashProviderConfigured;
  const performanceReady = input.performanceMonitoringReady && input.dashboardReady;
  const providerSecurityReady = input.providerSecretsServerSide && input.productionLocked && input.appEnvironment === 'production';
  const alertingReady = input.alertOwnerReady && input.alertSlaMinutes <= 30;
  const qaReady = input.physicalDeviceQaReady && crashReady && performanceReady && providerSecurityReady;

  const gates: ObservabilityGate[] = [
    {
      id: 'privacy_boundary',
      title: 'Privacy-safe telemetry boundary',
      body: privacyBoundaryReady
        ? 'Telemetry uses typed adapters and redacts sensitive metadata before analytics or logs.'
        : 'Analytics must never receive names, email, phone, OTP, exact location, message text, photos or provider secrets.',
      ready: privacyBoundaryReady,
      started: input.telemetryAdapterReady || input.privacySafeEventBuilderReady,
      nextStep: 'Keep all analytics behind the adapter and sanitize every event payload before provider delivery.',
    },
    {
      id: 'event_taxonomy',
      title: 'Event taxonomy',
      body: `${input.allowedEventCount}/${input.criticalEventCount} critical product events are mapped for privacy-safe analytics.`,
      ready: eventTaxonomyReady,
      started: input.allowedEventCount > 0,
      nextStep: 'Map onboarding, match view, interest/pass, chat unlock, date plan, report/block and support events.',
    },
    {
      id: 'consent_retention',
      title: 'Consent, opt-out and retention',
      body: consentRetentionReady
        ? 'Privacy controls, analytics opt-out/reset copy, retention notes and store data-safety disclosure are represented.'
        : 'Members need clear controls for analytics consent, learning reset, retention and data-safety disclosures.',
      ready: consentRetentionReady,
      started: input.consentControlsReady || input.dataSafetyDisclosureReady,
      nextStep: 'Expose analytics consent/opt-out in privacy settings and keep store Data Safety in sync with provider behavior.',
    },
    {
      id: 'crash_capture',
      title: 'Crash capture',
      body: crashReady
        ? 'Error boundary and production crash provider are connected.'
        : 'Error boundary exists; production needs a crash provider DSN and privacy-safe context.',
      ready: crashReady,
      started: input.crashBoundaryReady,
      nextStep: 'Connect Sentry/Bugsnag-style crash reporting with release tags and no PII in contexts.',
    },
    {
      id: 'performance_monitoring',
      title: 'Performance monitoring',
      body: performanceReady
        ? 'Startup, navigation, chat, media picker and checkout performance are monitored on dashboards.'
        : 'Launch needs performance dashboards for app start, chat send, media picker, date checkout and API latency.',
      ready: performanceReady,
      started: input.performanceMonitoringReady || input.dashboardReady,
      nextStep: 'Track privacy-safe timings for startup, route changes, chat send, image picker and reservation quote.',
    },
    {
      id: 'provider_security',
      title: 'Provider secrets and production lock',
      body: providerSecurityReady
        ? 'Analytics/crash credentials are server or environment scoped and production builds are locked.'
        : 'Provider DSNs, analytics write keys and replay settings must not expose secrets or private member content.',
      ready: providerSecurityReady,
      started: input.providerSecretsServerSide || input.productionLocked,
      nextStep: 'Store observability keys in EAS/server environments, disable sensitive session replay, and lock production config.',
    },
    {
      id: 'alerting_ownership',
      title: 'Alerting owner',
      body: input.alertOwnerReady
        ? `Alert owner assigned with ${input.alertSlaMinutes} minute response target.`
        : 'Crash spikes, auth failures, payment/date errors and push failures need an owner and SLA.',
      ready: alertingReady,
      started: input.alertOwnerReady,
      nextStep: 'Assign an on-call owner and route critical errors to Slack/email/PagerDuty-style alerts within 30 minutes.',
    },
    {
      id: 'production_qa',
      title: 'Real-device observability QA',
      body: qaReady
        ? 'Crash reporting, performance events and analytics consent were validated on production-like iOS and Android builds.'
        : 'Final QA must test crash capture, event delivery, opt-out, offline retry, app resume and release tagging on devices.',
      ready: qaReady,
      started: input.physicalDeviceQaReady,
      nextStep: 'Run physical-device QA for crash capture, event delivery, opt-out/reset, offline queue and provider downtime.',
    },
  ];

  const blockers = gates.filter((gate) => !gate.ready);
  const readyCount = gates.length - blockers.length;
  const setupBlockerIds: ObservabilityGateId[] = ['privacy_boundary', 'event_taxonomy', 'consent_retention'];
  const hasSetupBlocker = blockers.some((gate) => setupBlockerIds.includes(gate.id));

  return {
    status: blockers.length === 0 ? 'Ready for monitored launch' : hasSetupBlocker ? 'Privacy telemetry setup needed' : 'Final observability providers pending',
    score: Math.round(gates.reduce((sum, gate) => sum + gateScore(gate), 0) / gates.length),
    readyCount,
    total: gates.length,
    eventCoverage,
    blockerCount: blockers.length,
    blockers,
    gates,
    nextBestStep: blockers[0]?.nextStep ?? 'Run production smoke tests for crash reports, analytics events, opt-out, dashboards and alert routing.',
  };
}
