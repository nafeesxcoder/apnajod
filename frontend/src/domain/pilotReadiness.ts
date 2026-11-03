export type PilotEvidenceGateId =
  | 'hosted_backend'
  | 'auth_delivery'
  | 'security_tests'
  | 'ios_device_journey'
  | 'android_device_journey'
  | 'trust_ops_staffing'
  | 'incident_drill'
  | 'city_liquidity'
  | 'provider_sandbox'
  | 'observability_alerts'
  | 'public_legal_urls'
  | 'rollback_drill';

export type PilotEvidenceGate = {
  id: PilotEvidenceGateId;
  title: string;
  body: string;
  owner: string;
  ready: boolean;
  nextStep: string;
};

export type PilotReadinessInput = {
  pilotCity: string;
  hostedBackendVerified: boolean;
  authDeliveryVerified: boolean;
  securityTestsExecuted: boolean;
  iosDeviceJourneyPassed: boolean;
  androidDeviceJourneyPassed: boolean;
  trustOpsStaffed: boolean;
  incidentDrillPassed: boolean;
  liquidityWeeksVerified: number;
  requiredLiquidityWeeks: number;
  providerSandboxVerified: boolean;
  observabilityAlertDrillPassed: boolean;
  publicLegalUrlsVerified: boolean;
  rollbackDrillPassed: boolean;
};

export type PilotReadinessSnapshot = {
  pilotCity: string;
  status: 'Source plan only' | 'Pilot evidence incomplete' | 'Ready for controlled city pilot';
  evidencePercent: number;
  readyCount: number;
  total: number;
  deviceJourneysPassed: number;
  liquidityWeeksVerified: number;
  requiredLiquidityWeeks: number;
  blockers: PilotEvidenceGate[];
  gates: PilotEvidenceGate[];
  nextBestStep: string;
};

export function buildPilotReadinessSnapshot(input: PilotReadinessInput): PilotReadinessSnapshot {
  const liquidityReady = input.liquidityWeeksVerified >= input.requiredLiquidityWeeks;
  const gates: PilotEvidenceGate[] = [
    {
      id: 'hosted_backend',
      title: 'Hosted backend baseline',
      body: 'The target AWS environment matches reviewed API contracts, migrations and generated DTOs.',
      owner: 'Backend',
      ready: input.hostedBackendVerified,
      nextStep: 'Align hosted migration history, deploy the reviewed schema and verify generated types.',
    },
    {
      id: 'auth_delivery',
      title: 'Real OTP delivery',
      body: 'Email and phone OTP work without demo codes on physical devices.',
      owner: 'Backend',
      ready: input.authDeliveryVerified,
      nextStep: 'Configure email/SMS providers and complete success, retry, expiry and abuse tests.',
    },
    {
      id: 'security_tests',
      title: 'Executed RLS and storage tests',
      body: 'Positive and negative access tests pass against the pilot backend.',
      owner: 'Security',
      ready: input.securityTestsExecuted,
      nextStep: 'Run pgTAP and storage tests against the pilot project, including block and non-match denial.',
    },
    {
      id: 'ios_device_journey',
      title: 'iOS critical journey',
      body: 'Auth, profile, match, chat, report/block and date acceptance pass on a physical iPhone.',
      owner: 'Mobile QA',
      ready: input.iosDeviceJourneyPassed,
      nextStep: 'Run and record the signed iOS pilot journey on a physical device.',
    },
    {
      id: 'android_device_journey',
      title: 'Android critical journey',
      body: 'Auth, profile, match, chat, report/block and date acceptance pass on a physical Android device.',
      owner: 'Mobile QA',
      ready: input.androidDeviceJourneyPassed,
      nextStep: 'Run and record the signed Android pilot journey on a physical device.',
    },
    {
      id: 'trust_ops_staffing',
      title: 'Staffed Trust Ops coverage',
      body: 'Named reviewers and escalation owners cover the published pilot SLA.',
      owner: 'Trust Ops',
      ready: input.trustOpsStaffed,
      nextStep: 'Assign the reviewer rota, escalation owner and after-hours safety handoff.',
    },
    {
      id: 'incident_drill',
      title: 'Safety incident drill',
      body: 'Scam, harassment and unsafe-date drills meet evidence, response and appeal targets.',
      owner: 'Trust Ops',
      ready: input.incidentDrillPassed,
      nextStep: 'Run a timed incident drill and retain the reviewed evidence packet.',
    },
    {
      id: 'city_liquidity',
      title: `${input.pilotCity} cohort liquidity`,
      body: `${input.liquidityWeeksVerified}/${input.requiredLiquidityWeeks} required weeks have verified reciprocal supply and healthy outcomes.`,
      owner: 'City Ops',
      ready: liquidityReady,
      nextStep: `Measure balanced, reciprocal candidate supply in ${input.pilotCity} for ${input.requiredLiquidityWeeks} consecutive weeks.`,
    },
    {
      id: 'provider_sandbox',
      title: 'Provider sandbox evidence',
      body: 'Billing, push and marketplace integrations have traceable sandbox success and failure evidence.',
      owner: 'Platform',
      ready: input.providerSandboxVerified,
      nextStep: 'Complete provider sandbox transactions, webhooks, retries and reconciliation checks.',
    },
    {
      id: 'observability_alerts',
      title: 'Monitoring and alert drill',
      body: 'Crash, auth, chat, payment and safety alerts route to named owners within SLA.',
      owner: 'Platform',
      ready: input.observabilityAlertDrillPassed,
      nextStep: 'Connect privacy-safe monitoring and prove alert delivery with a timed drill.',
    },
    {
      id: 'public_legal_urls',
      title: 'Public legal and support URLs',
      body: 'Final Privacy, Terms, Community and Support pages are published over HTTPS.',
      owner: 'Legal',
      ready: input.publicLegalUrlsVerified,
      nextStep: 'Finalize company details and publish reviewed legal/support pages over HTTPS.',
    },
    {
      id: 'rollback_drill',
      title: 'Release rollback drill',
      body: 'The team can stop rollout, disable risky providers and restore a known-good build.',
      owner: 'Release',
      ready: input.rollbackDrillPassed,
      nextStep: 'Run a staged rollout and rollback drill with owners, timestamps and recovery evidence.',
    },
  ];

  const readyCount = gates.filter((gate) => gate.ready).length;
  const blockers = gates.filter((gate) => !gate.ready);
  const evidencePercent = Math.round((readyCount / gates.length) * 100);
  const status = readyCount === gates.length
    ? 'Ready for controlled city pilot'
    : readyCount === 0
      ? 'Source plan only'
      : 'Pilot evidence incomplete';

  return {
    pilotCity: input.pilotCity,
    status,
    evidencePercent,
    readyCount,
    total: gates.length,
    deviceJourneysPassed: Number(input.iosDeviceJourneyPassed) + Number(input.androidDeviceJourneyPassed),
    liquidityWeeksVerified: input.liquidityWeeksVerified,
    requiredLiquidityWeeks: input.requiredLiquidityWeeks,
    blockers,
    gates,
    nextBestStep: blockers[0]?.nextStep ?? `Open the controlled ${input.pilotCity} pilot and review guardrails daily.`,
  };
}
