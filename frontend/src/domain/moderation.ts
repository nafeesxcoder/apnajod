export type ModerationRisk = 'Low' | 'Medium' | 'High' | 'Critical';
export type ModerationStatus = 'new' | 'triage' | 'frozen' | 'escalated' | 'resolved';
export type ModerationCategory = 'identity' | 'harassment' | 'money_scam' | 'unsafe_meeting' | 'spam_velocity' | 'trust_review' | 'support';

export type ModerationSourceReport = {
  id: string;
  matchId: string;
  reason: string;
  details?: string;
  createdAt: number;
};

export type ModerationQueueItem = {
  id: string;
  member: string;
  category: ModerationCategory;
  risk: ModerationRisk;
  riskScore: number;
  reason: string;
  evidence: string[];
  action: string;
  slaHours: number;
  status: ModerationStatus;
  humanReviewRequired: boolean;
  canAutoHide: boolean;
};

export type ModerationSummary = {
  total: number;
  highOrCritical: number;
  humanReview: number;
  autoHideEligible: number;
  fastestSlaHours: number;
};

const moneyPattern = /(money|crypto|gift\s*card|wire|bank|cashapp|venmo|zelle|investment|loan|wallet)/i;
const harassmentPattern = /(harass|threat|abuse|disrespect|pressure|inappropriate|sexual|angry|insult)/i;
const identityPattern = /(fake|misleading|catfish|photo|identity|verification|id)/i;
const unsafePattern = /(unsafe|location|address|follow|stalk|meet|car|hotel|home)/i;
const offAppPattern = /(whatsapp|telegram|instagram|snap|off-app|outside|personal number)/i;

export function riskFromScore(score: number): ModerationRisk {
  if (score >= 90) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 35) return 'Medium';
  return 'Low';
}

export function slaForRisk(risk: ModerationRisk) {
  if (risk === 'Critical') return 2;
  if (risk === 'High') return 6;
  if (risk === 'Medium') return 24;
  return 72;
}

export function classifyModerationCategory(reason: string, details = ''): ModerationCategory {
  const text = `${reason} ${details}`;
  if (moneyPattern.test(text)) return 'money_scam';
  if (unsafePattern.test(text)) return 'unsafe_meeting';
  if (harassmentPattern.test(text)) return 'harassment';
  if (identityPattern.test(text)) return 'identity';
  return 'support';
}

export function scoreModerationCase(input: {
  reason: string;
  details?: string;
  previousReports?: number;
  blockedCount?: number;
  velocityFlag?: boolean;
}) {
  const text = `${input.reason} ${input.details ?? ''}`;
  let score = 12;
  const evidence: string[] = [];

  if (moneyPattern.test(text)) {
    score += 45;
    evidence.push('Money/crypto/gift-card language');
  }
  if (offAppPattern.test(text)) {
    score += 20;
    evidence.push('Pressure to move off-app');
  }
  if (unsafePattern.test(text)) {
    score += 28;
    evidence.push('Unsafe meeting/location signal');
  }
  if (harassmentPattern.test(text)) {
    score += 24;
    evidence.push('Harassment or boundary issue');
  }
  if (identityPattern.test(text)) {
    score += 16;
    evidence.push('Identity/profile consistency issue');
  }
  if (input.velocityFlag) {
    score += 18;
    evidence.push('Velocity anomaly');
  }
  if (input.previousReports) {
    score += Math.min(24, input.previousReports * 8);
    evidence.push(`${input.previousReports} prior report${input.previousReports === 1 ? '' : 's'}`);
  }
  if (input.blockedCount) {
    score += Math.min(16, input.blockedCount * 4);
    evidence.push(`${input.blockedCount} blocked member${input.blockedCount === 1 ? '' : 's'} in session`);
  }

  const riskScore = Math.min(100, score);
  return {
    riskScore,
    risk: riskFromScore(riskScore),
    evidence: evidence.length ? evidence : ['Single low-risk support signal'],
  };
}

function actionForCase(category: ModerationCategory, risk: ModerationRisk) {
  if (risk === 'Critical') return 'Freeze chat, escalate to Trust Ops lead, preserve evidence.';
  if (category === 'money_scam') return 'Freeze payment abilities and review chat context.';
  if (category === 'unsafe_meeting') return 'Prioritize safety outreach and date-plan review.';
  if (category === 'identity') return 'Request selfie/ID re-check before more discovery exposure.';
  if (category === 'harassment') return 'Warn or restrict messaging after human review.';
  if (category === 'spam_velocity') return 'Rate-limit actions and inspect device/account pattern.';
  return 'Triage support context and resolve with member-safe notes.';
}

export function buildModerationQueue(reports: readonly ModerationSourceReport[], blockedCount = 0): ModerationQueueItem[] {
  const localItems = reports.map((report, index) => {
    const category = classifyModerationCategory(report.reason, report.details);
    const scored = scoreModerationCase({
      reason: report.reason,
      details: report.details,
      previousReports: reports.filter((item) => item.matchId === report.matchId).length,
      blockedCount,
    });
    const humanReviewRequired = scored.risk !== 'Low' || category !== 'support';
    return {
      id: report.id,
      member: `Reported profile ${report.matchId}`,
      category,
      risk: scored.risk,
      riskScore: scored.riskScore,
      reason: report.reason,
      evidence: scored.evidence,
      action: actionForCase(category, scored.risk),
      slaHours: slaForRisk(scored.risk),
      status: index === 0 ? 'triage' : 'new',
      humanReviewRequired,
      canAutoHide: scored.risk === 'Critical',
    } satisfies ModerationQueueItem;
  });

  const seededItems: ModerationQueueItem[] = [
    {
      id: 'seed-velocity',
      member: 'Priya S.',
      category: 'spam_velocity',
      risk: 'Medium',
      riskScore: 52,
      reason: 'New account received 4 Sparks in 20 minutes.',
      evidence: ['Velocity anomaly', 'New account warm-up rule'],
      action: actionForCase('spam_velocity', 'Medium'),
      slaHours: 24,
      status: 'triage',
      humanReviewRequired: true,
      canAutoHide: false,
    },
    {
      id: 'seed-scam',
      member: 'Aman K.',
      category: 'money_scam',
      risk: 'High',
      riskScore: 78,
      reason: 'Reported for asking to move off-app and mentioning gift cards.',
      evidence: ['Money/crypto/gift-card language', 'Pressure to move off-app'],
      action: actionForCase('money_scam', 'High'),
      slaHours: 6,
      status: 'frozen',
      humanReviewRequired: true,
      canAutoHide: false,
    },
    {
      id: 'seed-trust',
      member: 'Nisha R.',
      category: 'trust_review',
      risk: 'Low',
      riskScore: 24,
      reason: 'Photo verification pending after profile update.',
      evidence: ['Identity/profile consistency issue'],
      action: 'Prompt selfie re-check and limit new outbound likes until complete.',
      slaHours: 72,
      status: 'new',
      humanReviewRequired: false,
      canAutoHide: false,
    },
  ];

  return [...localItems, ...seededItems].sort((a, b) => b.riskScore - a.riskScore || a.slaHours - b.slaHours);
}

export function summarizeModerationQueue(queue: readonly ModerationQueueItem[]): ModerationSummary {
  return {
    total: queue.length,
    highOrCritical: queue.filter((item) => item.risk === 'High' || item.risk === 'Critical').length,
    humanReview: queue.filter((item) => item.humanReviewRequired).length,
    autoHideEligible: queue.filter((item) => item.canAutoHide).length,
    fastestSlaHours: queue.length ? Math.min(...queue.map((item) => item.slaHours)) : 0,
  };
}
