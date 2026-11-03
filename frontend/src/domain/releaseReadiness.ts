export type ReleaseArea =
  | 'brand'
  | 'store'
  | 'legal'
  | 'compliance'
  | 'privacy'
  | 'safety'
  | 'backend'
  | 'payments'
  | 'fulfillment'
  | 'operations'
  | 'quality';

export type ReleaseGateStatus = 'ready' | 'final_connection' | 'blocked';

export type ReleaseGate = {
  id: string;
  area: ReleaseArea;
  title: string;
  body: string;
  status: ReleaseGateStatus;
  storeCritical: boolean;
};

export type ReleaseReadinessSnapshot = {
  previewReady: boolean;
  storeReady: boolean;
  readyCount: number;
  total: number;
  previewScore: number;
  storeScore: number;
  blockers: ReleaseGate[];
  finalConnection: ReleaseGate[];
  storeBlockers: ReleaseGate[];
  gates: ReleaseGate[];
};

export type ReleaseReadinessInput = {
  backendConnected: boolean;
  paymentsConnected: boolean;
  placesProviderConnected: boolean;
  pushNotificationsConnected: boolean;
  observabilityConnected: boolean;
  hasStoreAssets: boolean;
  hasStoreListing: boolean;
  hasStoreReviewAccess: boolean;
  hasProductionDemoGuard: boolean;
  hasPrivacyPolicy: boolean;
  hasTerms: boolean;
  hasCommunityGuidelines: boolean;
  hasPolicyCompliance: boolean;
  hasDataSafety: boolean;
  hasAgeGate: boolean;
  hasDataDeletion: boolean;
  hasSafetyOperations: boolean;
  hasAbuseFraudProtection: boolean;
  hasProductQA: boolean;
  hasInteractionQA: boolean;
};

const statusFrom = (ready: boolean, finalConnection = false): ReleaseGateStatus => {
  if (ready) return 'ready';
  return finalConnection ? 'final_connection' : 'blocked';
};

export function buildReleaseReadinessSnapshot(input: ReleaseReadinessInput): ReleaseReadinessSnapshot {
  const gates: ReleaseGate[] = [
    {
      id: 'brand_assets',
      area: 'brand',
      title: 'Brand assets',
      body: 'App icon, splash, adaptive icon and favicon are generated from the brand font.',
      status: statusFrom(input.hasStoreAssets),
      storeCritical: true,
    },
    {
      id: 'store_listing',
      area: 'store',
      title: 'Store listing copy',
      body: 'Play Store/App Store listing, screenshots, description and positioning are documented.',
      status: statusFrom(input.hasStoreListing),
      storeCritical: true,
    },
    {
      id: 'store_review_access',
      area: 'store',
      title: 'Reviewer access and notes',
      body: 'Store reviewers need working demo credentials, clear test instructions, safety notes and support contact.',
      status: statusFrom(input.hasStoreReviewAccess),
      storeCritical: true,
    },
    {
      id: 'production_demo_guard',
      area: 'store',
      title: 'Production demo guard',
      body: 'Demo OTP and preview-only payment flows must be disabled or clearly gated before production release.',
      status: statusFrom(input.hasProductionDemoGuard),
      storeCritical: true,
    },
    {
      id: 'privacy_policy',
      area: 'privacy',
      title: 'Privacy policy',
      body: 'Privacy policy explains matching, chat media, location, verification and deletion.',
      status: statusFrom(input.hasPrivacyPolicy),
      storeCritical: true,
    },
    {
      id: 'terms_guidelines',
      area: 'legal',
      title: 'Terms and community guidelines',
      body: 'Terms, serious-dating rules, safety expectations and moderation standards are drafted.',
      status: statusFrom(input.hasTerms && input.hasCommunityGuidelines),
      storeCritical: true,
    },
    {
      id: 'dating_policy_compliance',
      area: 'compliance',
      title: 'Dating app policy compliance',
      body: 'UGC moderation, report/block, age gate, subscription disclosure, location consent and real-world safety controls are covered.',
      status: statusFrom(input.hasPolicyCompliance),
      storeCritical: true,
    },
    {
      id: 'data_safety',
      area: 'privacy',
      title: 'Data safety disclosure',
      body: 'Store data-safety answers are ready for profile, chat, location, payments and support data.',
      status: statusFrom(input.hasDataSafety),
      storeCritical: true,
    },
    {
      id: 'age_gate',
      area: 'safety',
      title: 'Age and audience gate',
      body: 'Profile setup prevents unsupported ages before discovery opens.',
      status: statusFrom(input.hasAgeGate),
      storeCritical: true,
    },
    {
      id: 'delete_account',
      area: 'privacy',
      title: 'Delete account flow',
      body: 'In-app account deletion/clear-data path exists and can connect to backend deletion requests.',
      status: statusFrom(input.hasDataDeletion),
      storeCritical: true,
    },
    {
      id: 'safety_ops',
      area: 'operations',
      title: 'Safety and Trust Ops',
      body: 'Report, block, moderation queue, safety check-ins and support paths are available.',
      status: statusFrom(input.hasSafetyOperations),
      storeCritical: true,
    },
    {
      id: 'abuse_fraud_protection',
      area: 'safety',
      title: 'Abuse and fraud protection',
      body: 'Romance scam rules, message safety nudges, block graph, paid-action abuse limits and evidence workflows are ready.',
      status: statusFrom(input.hasAbuseFraudProtection),
      storeCritical: true,
    },
    {
      id: 'backend_connection',
      area: 'backend',
      title: 'AWS backend connection',
      body: 'Auth, database, storage, realtime chat and row-level policies must be connected for production.',
      status: statusFrom(input.backendConnected, true),
      storeCritical: true,
    },
    {
      id: 'payments_connection',
      area: 'payments',
      title: 'Payments and subscriptions',
      body: 'App-store subscriptions, Spark packs and optional date reservation payments need live provider keys.',
      status: statusFrom(input.paymentsConnected, true),
      storeCritical: true,
    },
    {
      id: 'places_provider',
      area: 'fulfillment',
      title: 'Places and reservation provider',
      body: 'Live venues, hours, ratings, maps and reservation holds need a production provider.',
      status: statusFrom(input.placesProviderConnected, true),
      storeCritical: false,
    },
    {
      id: 'push_notifications',
      area: 'backend',
      title: 'Push notifications',
      body: 'Profile views, Spark received and support updates need push tokens/provider setup.',
      status: statusFrom(input.pushNotificationsConnected, true),
      storeCritical: false,
    },
    {
      id: 'observability_connection',
      area: 'privacy',
      title: 'Analytics and crash monitoring',
      body: 'Privacy-consented analytics, crash reporting, performance dashboards and alert routing need production provider setup.',
      status: statusFrom(input.observabilityConnected, true),
      storeCritical: false,
    },
    {
      id: 'product_qa',
      area: 'quality',
      title: 'Product QA',
      body: 'Critical screens, flows and responsive shell are covered by readiness checks.',
      status: statusFrom(input.hasProductQA),
      storeCritical: true,
    },
    {
      id: 'interaction_qa',
      area: 'quality',
      title: 'Interaction QA',
      body: 'High-value buttons and outcomes are mapped for home, chat, dates, pricing and safety.',
      status: statusFrom(input.hasInteractionQA),
      storeCritical: true,
    },
  ];

  const readyCount = gates.filter((gate) => gate.status === 'ready').length;
  const blockers = gates.filter((gate) => gate.status === 'blocked');
  const finalConnection = gates.filter((gate) => gate.status === 'final_connection');
  const storeBlockers = gates.filter((gate) => gate.storeCritical && gate.status !== 'ready');
  const storeCriticalTotal = gates.filter((gate) => gate.storeCritical).length;
  const storeCriticalReady = gates.filter((gate) => gate.storeCritical && gate.status === 'ready').length;

  return {
    previewReady: blockers.length === 0,
    storeReady: storeBlockers.length === 0,
    readyCount,
    total: gates.length,
    previewScore: Math.round((readyCount / gates.length) * 100),
    storeScore: Math.round((storeCriticalReady / storeCriticalTotal) * 100),
    blockers,
    finalConnection,
    storeBlockers,
    gates,
  };
}
