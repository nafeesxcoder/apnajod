import { summarizeModerationQueue, type ModerationQueueItem } from './moderation';

export type TrustOpsStatus = 'Ready for staffed pilot' | 'Needs staffing' | 'Needs playbooks';

export type TrustOpsGateId =
  | 'reviewer_staffing'
  | 'sla_coverage'
  | 'critical_escalation'
  | 'evidence_audit'
  | 'member_safety_actions'
  | 'appeals_support'
  | 'reviewer_access'
  | 'incident_drill';

export type TrustOpsInput = {
  queue: readonly ModerationQueueItem[];
  reportCount: number;
  blockedCount: number;
  reviewerCount: number;
  supportCoverageHours: number;
  targetSlaHours: number;
  escalationOwnerReady: boolean;
  emergencyPlaybookReady: boolean;
  evidenceRetentionReady: boolean;
  blockAuditReady: boolean;
  reportBlockFlowReady: boolean;
  appealPathReady: boolean;
  supportContactReady: boolean;
  reviewerRbacReady: boolean;
  dualReviewReady: boolean;
  incidentDrillPassed: boolean;
};

export type TrustOpsGate = {
  id: TrustOpsGateId;
  title: string;
  body: string;
  ready: boolean;
  started: boolean;
  nextStep: string;
};

export type TrustOpsSnapshot = {
  status: TrustOpsStatus;
  score: number;
  readyCount: number;
  total: number;
  requiredReviewers: number;
  fastestSlaHours: number;
  highRiskCases: number;
  humanReviewCases: number;
  blockers: TrustOpsGate[];
  gates: TrustOpsGate[];
  nextBestStep: string;
};

function gateScore(gate: TrustOpsGate) {
  if (gate.ready) return 100;
  if (gate.started) return 55;
  return 0;
}

function requiredReviewerCount(summary: ReturnType<typeof summarizeModerationQueue>) {
  const workloadUnits = summary.humanReview + summary.highOrCritical * 2;
  return Math.max(2, Math.ceil(workloadUnits / 4));
}

export function buildTrustOpsSnapshot(input: TrustOpsInput): TrustOpsSnapshot {
  const summary = summarizeModerationQueue(input.queue);
  const requiredReviewers = requiredReviewerCount(summary);
  const fastestSlaHours = summary.fastestSlaHours || input.targetSlaHours;
  const reviewerReady = input.reviewerCount >= requiredReviewers;
  const slaReady = input.targetSlaHours <= Math.min(24, fastestSlaHours) && input.supportCoverageHours >= 12;
  const criticalEscalationReady = summary.highOrCritical === 0 || (
    input.escalationOwnerReady &&
    input.emergencyPlaybookReady &&
    input.targetSlaHours <= 6
  );
  const evidenceReady = input.evidenceRetentionReady && input.blockAuditReady;
  const safetyActionsReady = input.reportBlockFlowReady && input.reportCount >= 0 && input.blockedCount >= 0;
  const appealsReady = input.appealPathReady && input.supportContactReady;
  const reviewerAccessReady = input.reviewerRbacReady && input.dualReviewReady;

  const gates: TrustOpsGate[] = [
    {
      id: 'reviewer_staffing',
      title: 'Reviewer staffing',
      body: `${input.reviewerCount}/${requiredReviewers} reviewers assigned for ${summary.humanReview} human-review case(s).`,
      ready: reviewerReady,
      started: input.reviewerCount > 0,
      nextStep: `Assign at least ${requiredReviewers} trained Trust Ops reviewer${requiredReviewers === 1 ? '' : 's'} before city growth.`,
    },
    {
      id: 'sla_coverage',
      title: 'SLA coverage',
      body: `${input.targetSlaHours}h target SLA · ${input.supportCoverageHours}h/day coverage · fastest queue SLA ${fastestSlaHours}h.`,
      ready: slaReady,
      started: input.supportCoverageHours > 0,
      nextStep: 'Set sub-24h coverage for normal cases and match the fastest active queue SLA.',
    },
    {
      id: 'critical_escalation',
      title: 'Critical escalation',
      body: `${summary.highOrCritical} high/critical case(s) need lead ownership, emergency playbook and rapid handoff.`,
      ready: criticalEscalationReady,
      started: input.escalationOwnerReady || input.emergencyPlaybookReady,
      nextStep: 'Name a Trust Ops lead and finalize money-scam, harassment, unsafe-date and emergency escalation playbooks.',
    },
    {
      id: 'evidence_audit',
      title: 'Evidence and block audit',
      body: input.evidenceRetentionReady && input.blockAuditReady
        ? 'Reports, chat evidence, payment events, blocks and reviewer notes stay linked.'
        : 'Evidence retention and block graph audit must be connected before enforcement scales.',
      ready: evidenceReady,
      started: input.evidenceRetentionReady || input.blockAuditReady,
      nextStep: 'Keep report evidence, block graph, reviewer note and enforcement action in one audit trail.',
    },
    {
      id: 'member_safety_actions',
      title: 'Member safety actions',
      body: `${input.reportCount} report(s) and ${input.blockedCount} block(s) prove report/block flows are reachable.`,
      ready: safetyActionsReady,
      started: input.reportBlockFlowReady,
      nextStep: 'Keep report, block, unmatch, check-in and emergency help reachable from profile and chat.',
    },
    {
      id: 'appeals_support',
      title: 'Appeals and support handoff',
      body: input.appealPathReady && input.supportContactReady
        ? 'Support contact and appeal route are ready for enforcement or billing-impact decisions.'
        : 'Members need a clear support/appeal route when moderation affects access or payment.',
      ready: appealsReady,
      started: input.appealPathReady || input.supportContactReady,
      nextStep: 'Publish support contact, appeal route and internal handoff notes for enforcement decisions.',
    },
    {
      id: 'reviewer_access',
      title: 'Reviewer access controls',
      body: reviewerAccessReady
        ? 'Reviewer roles are least-privilege and critical outcomes require a second qualified reviewer.'
        : 'Staff access and dual review must be proven before sensitive enforcement begins.',
      ready: reviewerAccessReady,
      started: input.reviewerRbacReady || input.dualReviewReady,
      nextStep: 'Provision named reviewer roles and require lead/legal approval for critical resolution and appeals.',
    },
    {
      id: 'incident_drill',
      title: 'Timed incident drill',
      body: input.incidentDrillPassed
        ? 'Scam, harassment and unsafe-date drills passed evidence, response, notification and appeal targets.'
        : 'Operational playbooks still need a timed end-to-end drill with retained evidence.',
      ready: input.incidentDrillPassed,
      started: input.emergencyPlaybookReady,
      nextStep: 'Run timed money-scam, harassment and unsafe-date drills and retain the reviewed evidence packet.',
    },
  ];

  const blockers = gates.filter((gate) => !gate.ready);
  const readyCount = gates.length - blockers.length;
  const score = Math.round(gates.reduce((sum, gate) => sum + gateScore(gate), 0) / gates.length);
  const staffingBlocked = gates.some((gate) => gate.id === 'reviewer_staffing' && !gate.ready);

  return {
    status: blockers.length === 0 ? 'Ready for staffed pilot' : staffingBlocked ? 'Needs staffing' : 'Needs playbooks',
    score,
    readyCount,
    total: gates.length,
    requiredReviewers,
    fastestSlaHours,
    highRiskCases: summary.highOrCritical,
    humanReviewCases: summary.humanReview,
    blockers,
    gates,
    nextBestStep: blockers[0]?.nextStep ?? 'Run a closed-city Trust Ops drill before opening more growth loops.',
  };
}
