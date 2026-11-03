import { describe, expect, it } from 'vitest';
import { buildModerationQueue } from './moderation';
import { buildTrustOpsSnapshot, type TrustOpsInput } from './trustOps';

const queue = buildModerationQueue([
  {
    id: 'report-1',
    matchId: 'm-1',
    reason: 'Money scam',
    details: 'Asked for gift cards and wanted to move to WhatsApp.',
    createdAt: Date.now(),
  },
], 1);

const readyInput: TrustOpsInput = {
  queue,
  reportCount: 1,
  blockedCount: 1,
  reviewerCount: 3,
  supportCoverageHours: 16,
  targetSlaHours: 2,
  escalationOwnerReady: true,
  emergencyPlaybookReady: true,
  evidenceRetentionReady: true,
  blockAuditReady: true,
  reportBlockFlowReady: true,
  appealPathReady: true,
  supportContactReady: true,
  reviewerRbacReady: true,
  dualReviewReady: true,
  incidentDrillPassed: true,
};

describe('trust ops readiness', () => {
  it('blocks staffed pilot when reviewers are missing', () => {
    const snapshot = buildTrustOpsSnapshot({
      ...readyInput,
      reviewerCount: 0,
    });

    expect(snapshot.status).toBe('Needs staffing');
    expect(snapshot.blockers.map((gate) => gate.id)).toContain('reviewer_staffing');
  });

  it('requires critical escalation playbooks for high risk reports', () => {
    const snapshot = buildTrustOpsSnapshot({
      ...readyInput,
      escalationOwnerReady: false,
      emergencyPlaybookReady: false,
    });

    expect(snapshot.status).toBe('Needs playbooks');
    expect(snapshot.blockers.map((gate) => gate.id)).toContain('critical_escalation');
    expect(snapshot.nextBestStep).toContain('Trust Ops lead');
  });

  it('passes once staffing, SLA, evidence, safety actions and appeals are ready', () => {
    const snapshot = buildTrustOpsSnapshot(readyInput);

    expect(snapshot.status).toBe('Ready for staffed pilot');
    expect(snapshot.score).toBe(100);
    expect(snapshot.blockers).toEqual([]);
  });

  it('keeps launch blocked until reviewer access and timed drills are proven', () => {
    const snapshot = buildTrustOpsSnapshot({...readyInput,dualReviewReady:false,incidentDrillPassed:false});
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(expect.arrayContaining(['reviewer_access','incident_drill']));
  });
});
