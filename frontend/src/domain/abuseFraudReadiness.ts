export type AbuseFraudLaunchStatus =
  | 'Ready for safe scale'
  | 'Final fraud providers pending'
  | 'Abuse setup needed';

export type AbuseFraudGateId =
  | 'romance_scam_rules'
  | 'message_safety_scanner'
  | 'report_block_graph'
  | 'paid_action_abuse'
  | 'account_integrity'
  | 'fraud_providers'
  | 'freeze_evidence_actions'
  | 'member_education'
  | 'production_qa';

export type AbuseFraudReadinessInput = {
  appEnvironment: string;
  romanceScamRulesReady: boolean;
  moneyOffAppLocationRulesReady: boolean;
  messageSafetyScannerReady: boolean;
  reportBlockFlowReady: boolean;
  blockGraphReady: boolean;
  roseSparkDailyLimitsReady: boolean;
  refundDisputeReviewReady: boolean;
  profileReverificationReady: boolean;
  trustedVouchReady: boolean;
  duplicateAccountRulesReady: boolean;
  deviceRiskProviderConnected: boolean;
  captchaRiskProviderConnected: boolean;
  adminFreezeActionsReady: boolean;
  evidenceAuditReady: boolean;
  appealSupportReady: boolean;
  safetyEducationReady: boolean;
  physicalDeviceQaReady: boolean;
  productionLocked: boolean;
};

export type AbuseFraudGate = {
  id: AbuseFraudGateId;
  title: string;
  body: string;
  ready: boolean;
  started: boolean;
  nextStep: string;
};

export type AbuseFraudReadinessSnapshot = {
  status: AbuseFraudLaunchStatus;
  score: number;
  readyCount: number;
  total: number;
  coreProtectionScore: number;
  providerProtectionScore: number;
  blockerCount: number;
  blockers: AbuseFraudGate[];
  gates: AbuseFraudGate[];
  nextBestStep: string;
};

function gateScore(gate: AbuseFraudGate) {
  if (gate.ready) return 100;
  if (gate.started) return 55;
  return 0;
}

function percent(ready: number, total: number) {
  return total ? Math.round((ready / total) * 100) : 0;
}

export function buildAbuseFraudReadinessSnapshot(input: AbuseFraudReadinessInput): AbuseFraudReadinessSnapshot {
  const scamRulesReady = input.romanceScamRulesReady && input.moneyOffAppLocationRulesReady;
  const reportBlockReady = input.reportBlockFlowReady && input.blockGraphReady;
  const paidActionReady = input.roseSparkDailyLimitsReady && input.refundDisputeReviewReady;
  const accountIntegrityReady = input.profileReverificationReady && input.trustedVouchReady && input.duplicateAccountRulesReady;
  const fraudProvidersReady = input.deviceRiskProviderConnected && input.captchaRiskProviderConnected;
  const enforcementReady = input.adminFreezeActionsReady && input.evidenceAuditReady && input.appealSupportReady;
  const qaReady = input.physicalDeviceQaReady && input.productionLocked && input.appEnvironment === 'production';

  const coreFlags = [
    scamRulesReady,
    input.messageSafetyScannerReady,
    reportBlockReady,
    paidActionReady,
    accountIntegrityReady,
    enforcementReady,
    input.safetyEducationReady,
  ];
  const providerFlags = [input.deviceRiskProviderConnected, input.captchaRiskProviderConnected, input.physicalDeviceQaReady, input.productionLocked];

  const gates: AbuseFraudGate[] = [
    {
      id: 'romance_scam_rules',
      title: 'Romance scam rules',
      body: scamRulesReady
        ? 'Money, off-app pressure, private location and identity-pressure rules are represented.'
        : 'Romance scam protection needs money, crypto, gift-card, off-app and private-location rules.',
      ready: scamRulesReady,
      started: input.romanceScamRulesReady || input.moneyOffAppLocationRulesReady,
      nextStep: 'Keep money, crypto, gift-card, off-app, secrecy and private-location rules in chat and report scans.',
    },
    {
      id: 'message_safety_scanner',
      title: 'In-chat safety scanner',
      body: input.messageSafetyScannerReady
        ? 'Draft messages can be scanned for safety nudges before risky content is sent.'
        : 'Chat needs draft-level warnings for money requests, pressure, harassment and exact-location sharing.',
      ready: input.messageSafetyScannerReady,
      started: input.messageSafetyScannerReady,
      nextStep: 'Show calm nudges before sending risky messages and route high-risk drafts to Trust Ops context.',
    },
    {
      id: 'report_block_graph',
      title: 'Report, block and graph removal',
      body: reportBlockReady
        ? 'Report/block flows remove members across discovery, likes and chat surfaces.'
        : 'Block graph must win over recommendations, likes, messages, dates and notifications.',
      ready: reportBlockReady,
      started: input.reportBlockFlowReady || input.blockGraphReady,
      nextStep: 'Apply block/report checks to discovery ranking, chat, dates, notifications and profile-view alerts.',
    },
    {
      id: 'paid_action_abuse',
      title: 'Paid romantic-action abuse',
      body: paidActionReady
        ? 'Roses, Sparks, refunds and disputes have anti-spam limits and review paths.'
        : 'Paid romantic actions need velocity limits, refund review and payment freeze rules.',
      ready: paidActionReady,
      started: input.roseSparkDailyLimitsReady,
      nextStep: 'Rate-limit roses/Sparks, freeze suspicious purchases and link refunds/disputes to safety cases.',
    },
    {
      id: 'account_integrity',
      title: 'Account integrity',
      body: accountIntegrityReady
        ? 'Profile re-verification, trusted vouches and duplicate-account rules are represented.'
        : 'Fake profiles need selfie re-check, vouch review and duplicate-device/account rules.',
      ready: accountIntegrityReady,
      started: input.profileReverificationReady || input.trustedVouchReady,
      nextStep: 'Gate suspicious profile edits, photo changes and duplicate accounts behind re-verification or human review.',
    },
    {
      id: 'fraud_providers',
      title: 'Device and CAPTCHA risk providers',
      body: fraudProvidersReady
        ? 'Device risk and CAPTCHA providers are connected for suspicious account creation and velocity spikes.'
        : 'Production still needs device-risk and CAPTCHA provider checks for signup, login and burst activity.',
      ready: fraudProvidersReady,
      started: input.deviceRiskProviderConnected || input.captchaRiskProviderConnected,
      nextStep: 'Connect device fingerprint/risk scoring and CAPTCHA/rate-limit checks only on suspicious flows.',
    },
    {
      id: 'freeze_evidence_actions',
      title: 'Freeze, evidence and appeals',
      body: enforcementReady
        ? 'Admins can freeze risky surfaces, preserve evidence and provide appeal/support paths.'
        : 'Enforcement needs freeze actions, evidence retention and a member-safe appeal route.',
      ready: enforcementReady,
      started: input.adminFreezeActionsReady || input.evidenceAuditReady,
      nextStep: 'Keep chat/payment/date freezes, evidence packets, reviewer notes and appeals in one audit trail.',
    },
    {
      id: 'member_education',
      title: 'Member education',
      body: input.safetyEducationReady
        ? 'Safety Center copy warns members about money requests, off-app pressure, public dates and private reporting.'
        : 'Members need simple, repeated safety education inside chat, dates and Safety Center.',
      ready: input.safetyEducationReady,
      started: input.safetyEducationReady,
      nextStep: 'Add gentle safety copy near chat, date plans and support so protection feels premium, not scary.',
    },
    {
      id: 'production_qa',
      title: 'Production abuse QA',
      body: qaReady
        ? 'Abuse flows were tested on production-like iOS and Android builds.'
        : 'Final QA must test suspicious signup, report/block, freeze, refund dispute, off-app warning and re-verification flows.',
      ready: qaReady,
      started: input.physicalDeviceQaReady || input.productionLocked,
      nextStep: 'Run physical-device abuse drills for money scam, harassment, fake profile and unsafe-date scenarios.',
    },
  ];

  const blockers = gates.filter((gate) => !gate.ready);
  const readyCount = gates.length - blockers.length;
  const setupBlockerIds: AbuseFraudGateId[] = [
    'romance_scam_rules',
    'message_safety_scanner',
    'report_block_graph',
    'paid_action_abuse',
    'account_integrity',
    'freeze_evidence_actions',
    'member_education',
  ];
  const hasSetupBlocker = blockers.some((gate) => setupBlockerIds.includes(gate.id));

  return {
    status: blockers.length === 0 ? 'Ready for safe scale' : hasSetupBlocker ? 'Abuse setup needed' : 'Final fraud providers pending',
    score: Math.round(gates.reduce((sum, gate) => sum + gateScore(gate), 0) / gates.length),
    readyCount,
    total: gates.length,
    coreProtectionScore: percent(coreFlags.filter(Boolean).length, coreFlags.length),
    providerProtectionScore: percent(providerFlags.filter(Boolean).length, providerFlags.length),
    blockerCount: blockers.length,
    blockers,
    gates,
    nextBestStep: blockers[0]?.nextStep ?? 'Run abuse and fraud drills with production providers, Trust Ops owners and physical devices.',
  };
}
