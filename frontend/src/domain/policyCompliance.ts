export type PolicyComplianceArea =
  | 'ugc'
  | 'safety'
  | 'privacy'
  | 'billing'
  | 'real_world';

export type PolicyComplianceInput = {
  hasReportFlow: boolean;
  hasBlockFlow: boolean;
  hasModerationQueue: boolean;
  hasCommunityGuidelines: boolean;
  hasAgeGate: boolean;
  hasAccountDeletion: boolean;
  hasPrivacyPolicy: boolean;
  hasDataSafetyDisclosure: boolean;
  hasSubscriptionDisclosure: boolean;
  hasLocationConsent: boolean;
  hasSafetyCheckIns: boolean;
};

export type PolicyComplianceItem = {
  id: string;
  area: PolicyComplianceArea;
  title: string;
  body: string;
  ready: boolean;
  storeCritical: boolean;
};

export type PolicyComplianceSnapshot = {
  ready: boolean;
  score: number;
  readyCount: number;
  total: number;
  blockers: PolicyComplianceItem[];
  warnings: PolicyComplianceItem[];
  items: PolicyComplianceItem[];
};

export function buildPolicyComplianceSnapshot(input: PolicyComplianceInput): PolicyComplianceSnapshot {
  const ugcModerationReady = input.hasReportFlow && input.hasBlockFlow && input.hasModerationQueue && input.hasCommunityGuidelines;
  const privacyReady = input.hasPrivacyPolicy && input.hasDataSafetyDisclosure && input.hasAccountDeletion;
  const realWorldSafetyReady = input.hasLocationConsent && input.hasSafetyCheckIns;

  const items: PolicyComplianceItem[] = [
    {
      id: 'ugc_moderation',
      area: 'ugc',
      title: 'User content moderation',
      body: ugcModerationReady
        ? 'Chat/profile content has report, block, guidelines and moderation queue coverage.'
        : 'Store review expects report/block, community rules and moderation process for user-generated content.',
      ready: ugcModerationReady,
      storeCritical: true,
    },
    {
      id: 'report_block',
      area: 'safety',
      title: 'Report and block access',
      body: input.hasReportFlow && input.hasBlockFlow
        ? 'Members can privately report, block and unmatch from profile/chat surfaces.'
        : 'Report and block must be obvious and reachable from member interactions.',
      ready: input.hasReportFlow && input.hasBlockFlow,
      storeCritical: true,
    },
    {
      id: 'age_audience',
      area: 'safety',
      title: 'Age and audience controls',
      body: input.hasAgeGate
        ? 'Current serious-dating audience gate is enforced before discovery opens.'
        : 'Dating apps need a clear adult/audience gate before matching.',
      ready: input.hasAgeGate,
      storeCritical: true,
    },
    {
      id: 'privacy_deletion',
      area: 'privacy',
      title: 'Privacy and deletion',
      body: privacyReady
        ? 'Privacy policy, data safety disclosure and account deletion path are represented.'
        : 'Privacy policy, data safety answers and delete-account route must be ready before store submission.',
      ready: privacyReady,
      storeCritical: true,
    },
    {
      id: 'billing_transparency',
      area: 'billing',
      title: 'Subscription transparency',
      body: input.hasSubscriptionDisclosure
        ? 'Membership/Spark checkout explains store billing, restore purchase and preview limits.'
        : 'Premium dating apps need clear subscription terms, pricing and restore purchase path.',
      ready: input.hasSubscriptionDisclosure,
      storeCritical: true,
    },
    {
      id: 'real_world_safety',
      area: 'real_world',
      title: 'Real-world date safety',
      body: realWorldSafetyReady
        ? 'Approximate location consent and date check-ins are covered.'
        : 'Location sharing and offline date planning need consent and safety boundaries.',
      ready: realWorldSafetyReady,
      storeCritical: true,
    },
  ];

  const readyCount = items.filter((item) => item.ready).length;
  const blockers = items.filter((item) => item.storeCritical && !item.ready);

  return {
    ready: blockers.length === 0,
    score: Math.round((readyCount / items.length) * 100),
    readyCount,
    total: items.length,
    blockers,
    warnings: items.filter((item) => !item.ready && !item.storeCritical),
    items,
  };
}
