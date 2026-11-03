import { classifyModerationCategory, scoreModerationCase, type ModerationCategory, type ModerationRisk } from './moderation';

export type SafetySeverity = 'calm' | 'caution' | 'high' | 'urgent';
export type SafetySignalType = 'money' | 'off_app' | 'private_location' | 'pressure' | 'identity' | 'harassment';

export type SafetySignal = {
  type: SafetySignalType;
  label: string;
  evidence: string;
};

export type MessageSafetyScan = {
  score: number;
  severity: SafetySeverity;
  signals: SafetySignal[];
  nudgeTitle: string;
  nudgeBody: string;
  recommendedAction: string;
};

export type SafetyChecklistItem = {
  key: 'reporting' | 'blocking' | 'date_checkins' | 'privacy_controls' | 'moderation_queue';
  title: string;
  body: string;
  ready: boolean;
};

const signalRules: Array<{ type: SafetySignalType; label: string; pattern: RegExp; evidence: string; score: number }> = [
  { type: 'money', label: 'Money request', pattern: /(money|crypto|gift\s*card|wire|bank|cashapp|venmo|zelle|investment|loan|wallet)/i, evidence: 'Money, crypto, gift-card or payment language', score: 45 },
  { type: 'off_app', label: 'Move off app', pattern: /(whatsapp|telegram|instagram|snapchat|snap|phone number|personal number|outside this app|off[-\s]?app)/i, evidence: 'Pressure to move conversation outside Milaan', score: 20 },
  { type: 'private_location', label: 'Private location', pattern: /(home address|my place|your place|hotel|room number|pick you up|send location|exact location|where do you live)/i, evidence: 'Exact address, private place or pickup language', score: 30 },
  { type: 'pressure', label: 'Pressure', pattern: /(now|right now|don.?t tell|secret|prove it|trust me|why not|come alone|no one needs to know)/i, evidence: 'Pressure, secrecy or boundary-testing language', score: 18 },
  { type: 'identity', label: 'Identity concern', pattern: /(fake|catfish|id|passport|driver.?s license|verification|send selfie|prove your identity)/i, evidence: 'Identity or document request language', score: 16 },
  { type: 'harassment', label: 'Harassment', pattern: /(threat|abuse|stupid|shut up|sexual|nude|inappropriate|insult|angry|harass)/i, evidence: 'Harassment, threat or sexual pressure language', score: 28 },
];

export function safetySeverityFromScore(score: number): SafetySeverity {
  if (score >= 82) return 'urgent';
  if (score >= 55) return 'high';
  if (score >= 20) return 'caution';
  return 'calm';
}

export function scanMessageSafety(text: string): MessageSafetyScan {
  const normalized = text.trim();
  const signals = signalRules
    .filter((rule) => rule.pattern.test(normalized))
    .map((rule) => ({ type: rule.type, label: rule.label, evidence: rule.evidence }));
  const score = Math.min(100, signalRules.reduce((total, rule) => total + (rule.pattern.test(normalized) ? rule.score : 0), normalized ? 8 : 0));
  const severity = safetySeverityFromScore(score);

  if (!normalized || severity === 'calm') {
    return {
      score: normalized ? score : 0,
      severity: 'calm',
      signals,
      nudgeTitle: 'Conversation looks normal',
      nudgeBody: 'Milaan scans only this in-app draft for safety hints.',
      recommendedAction: 'Keep early conversations respectful and inside the app.',
    };
  }

  if (signals.some((signal) => signal.type === 'money')) {
    return {
      score,
      severity,
      signals,
      nudgeTitle: 'Money talk is a major red flag',
      nudgeBody: 'Avoid sending money, crypto, gift cards or financial details to anyone you meet here.',
      recommendedAction: 'Keep the chat in-app and report if someone asks for money.',
    };
  }

  if (signals.some((signal) => signal.type === 'private_location')) {
    return {
      score,
      severity,
      signals,
      nudgeTitle: 'Protect exact location',
      nudgeBody: 'For early dates, use public places and share only approximate area until trust is built.',
      recommendedAction: 'Use Date Plan + Safety Check-in instead of sending exact address.',
    };
  }

  if (signals.some((signal) => signal.type === 'off_app')) {
    return {
      score,
      severity,
      signals,
      nudgeTitle: 'Stay in Milaan early',
      nudgeBody: 'Moving off-app too soon can make reporting and safety review harder.',
      recommendedAction: 'Continue here until verification, intent and comfort are clear.',
    };
  }

  return {
    score,
    severity,
    signals,
    nudgeTitle: 'Boundary check',
    nudgeBody: 'This draft contains pressure or sensitive language. Keep it respectful and simple.',
    recommendedAction: 'Rewrite with a calmer tone or use the Safety Center if something feels wrong.',
  };
}

export function buildReportActionPlan(reason: string, details = ''): {
  category: ModerationCategory;
  risk: ModerationRisk;
  riskScore: number;
  primaryAction: string;
  memberCopy: string;
} {
  const category = classifyModerationCategory(reason, details);
  const scored = scoreModerationCase({ reason, details, previousReports: 1 });
  const primaryAction =
    category === 'money_scam'
      ? 'Freeze payments and send to Trust Ops review.'
      : category === 'unsafe_meeting'
        ? 'Suggest block, safety check-in, and review date plan context.'
        : category === 'harassment'
          ? 'Offer private block and preserve chat evidence.'
          : category === 'identity'
            ? 'Request re-verification before more exposure.'
            : 'Create support ticket and monitor for repeat signals.';

  return {
    category,
    risk: scored.risk,
    riskScore: scored.riskScore,
    primaryAction,
    memberCopy: scored.risk === 'Low' ? 'Saved for review.' : 'This will be reviewed privately. The other member is not notified.',
  };
}

export function buildSafetyChecklist(input: {
  reportsCount: number;
  blockedCount: number;
  datePlansCount: number;
  safeCheckInsCount: number;
}): SafetyChecklistItem[] {
  return [
    {
      key: 'reporting',
      title: 'Private reports',
      body: input.reportsCount ? `${input.reportsCount} report${input.reportsCount === 1 ? '' : 's'} stored for review.` : 'Report flow is ready and private.',
      ready: true,
    },
    {
      key: 'blocking',
      title: 'Private block',
      body: input.blockedCount ? `${input.blockedCount} member${input.blockedCount === 1 ? '' : 's'} hidden from discovery.` : 'Block removes a member quietly from your app.',
      ready: true,
    },
    {
      key: 'date_checkins',
      title: 'Date check-ins',
      body: input.datePlansCount ? `${input.safeCheckInsCount}/${input.datePlansCount} planned dates marked safe.` : 'Create a date plan to activate check-ins.',
      ready: input.datePlansCount === 0 ? false : input.safeCheckInsCount > 0,
    },
    {
      key: 'privacy_controls',
      title: 'Privacy controls',
      body: 'Last online, profile-view thresholds and discovery signals are designed to be user-controlled.',
      ready: true,
    },
    {
      key: 'moderation_queue',
      title: 'Trust Ops queue',
      body: 'Reports, blocks and red flags map into admin triage before backend/API keys.',
      ready: true,
    },
  ];
}

export function safetyReadinessScore(items: readonly SafetyChecklistItem[]) {
  if (items.length === 0) return 0;
  return Math.round((items.filter((item) => item.ready).length / items.length) * 100);
}
