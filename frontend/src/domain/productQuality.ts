export type AppScreenKey =
  | 'splash'
  | 'welcome'
  | 'auth'
  | 'otp'
  | 'verify'
  | 'profileSetup'
  | 'vibes'
  | 'intent'
  | 'alignment'
  | 'home'
  | 'circle'
  | 'discovery'
  | 'detail'
  | 'mutual'
  | 'icebreaker'
  | 'chat'
  | 'datePlan'
  | 'safety'
  | 'likes'
  | 'profile'
  | 'pricing'
  | 'support'
  | 'coach'
  | 'events'
  | 'executive'
  | 'verifyHub'
  | 'admin';

export type CriticalFlow = {
  id: string;
  label: string;
  screens: AppScreenKey[];
  requiredActions: string[];
  releaseCritical: boolean;
};

export type ProductQualityItem = {
  id: string;
  title: string;
  body: string;
  ready: boolean;
  severity: 'info' | 'important' | 'blocker';
};

export type ProductQualitySnapshot = {
  score: number;
  readyItems: number;
  totalItems: number;
  blockers: ProductQualityItem[];
  important: ProductQualityItem[];
  items: ProductQualityItem[];
};

export const appScreens: AppScreenKey[] = [
  'splash',
  'welcome',
  'auth',
  'otp',
  'verify',
  'profileSetup',
  'vibes',
  'intent',
  'alignment',
  'home',
  'circle',
  'discovery',
  'detail',
  'mutual',
  'icebreaker',
  'chat',
  'datePlan',
  'safety',
  'likes',
  'profile',
  'pricing',
  'support',
  'coach',
  'events',
  'executive',
  'verifyHub',
  'admin',
];

export const criticalFlows: CriticalFlow[] = [
  {
    id: 'onboarding',
    label: 'Fast serious-relationship onboarding',
    screens: ['welcome', 'auth', 'otp', 'verify', 'profileSetup', 'vibes', 'intent', 'alignment', 'home'],
    requiredActions: ['phone/email start', 'OTP verification', 'selfie/gallery verification', 'profile save', 'vibe selection', 'relationship intent'],
    releaseCritical: true,
  },
  {
    id: 'match_to_chat',
    label: 'Match discovery to unlocked chat',
    screens: ['home', 'detail', 'mutual', 'icebreaker', 'chat'],
    requiredActions: ['view profile', 'send interest', 'answer icebreaker', 'send message', 'report/block'],
    releaseCritical: true,
  },
  {
    id: 'premium_conversion',
    label: 'Membership and Spark purchase preview',
    screens: ['likes', 'pricing', 'home', 'chat'],
    requiredActions: ['view plans', 'select package', 'buy Spark pack preview', 'restore purchase preview'],
    releaseCritical: true,
  },
  {
    id: 'real_world_date',
    label: 'Date planning and safety check-in',
    screens: ['chat', 'datePlan', 'safety', 'events'],
    requiredActions: ['suggest place', 'reserve preview', 'send date card', 'safety check-in'],
    releaseCritical: true,
  },
  {
    id: 'trust_and_support',
    label: 'Trust, support, moderation and account control',
    screens: ['verifyHub', 'safety', 'support', 'admin', 'profile'],
    requiredActions: ['verification hub', 'submit report', 'block/unmatch', 'support ticket', 'delete account preview'],
    releaseCritical: true,
  },
  {
    id: 'executive_circle',
    label: 'Executive Circle premium path',
    screens: ['executive', 'verifyHub', 'events', 'datePlan', 'pricing'],
    requiredActions: ['apply', 'business proof preview', 'concierge request', 'VIP date plan', 'annual plan CTA'],
    releaseCritical: false,
  },
];

export const responsiveProfiles = [
  { id: 'phone', label: 'Phone', minWidth: 320, maxWidth: 480, mustSupport: true },
  { id: 'tablet', label: 'Tablet', minWidth: 768, maxWidth: 1024, mustSupport: true },
  { id: 'desktop', label: 'Desktop web preview', minWidth: 1025, maxWidth: 1440, mustSupport: true },
] as const;

export function findMissingFlowScreens(availableScreens: readonly AppScreenKey[], flows: readonly CriticalFlow[] = criticalFlows) {
  const available = new Set(availableScreens);
  return flows.flatMap((flow) =>
    flow.screens
      .filter((screen) => !available.has(screen))
      .map((screen) => ({ flowId: flow.id, flowLabel: flow.label, screen }))
  );
}

export function buildProductQualitySnapshot(input: {
  availableScreens?: readonly AppScreenKey[];
  hasBottomNavScreens?: readonly AppScreenKey[];
  hasSafetyActions: boolean;
  hasSupportFlow: boolean;
  hasPricingFlow: boolean;
  hasResponsiveShell: boolean;
  hasBackendConnected: boolean;
}) {
  const availableScreens = input.availableScreens ?? appScreens;
  const missingScreens = findMissingFlowScreens(availableScreens);
  const navTargetsReady = missingScreens.length === 0;
  const bottomNav = new Set(input.hasBottomNavScreens ?? []);
  const coreBottomNavReady = ['home', 'likes', 'chat', 'profile', 'discovery', 'coach', 'executive'].every((screen) => bottomNav.has(screen as AppScreenKey));
  const releaseCriticalFlowsReady = criticalFlows.filter((flow) => flow.releaseCritical).every((flow) => flow.screens.every((screen) => availableScreens.includes(screen)));

  const items: ProductQualityItem[] = [
    {
      id: 'navigation',
      title: 'Navigation map',
      body: navTargetsReady ? 'All critical flow screens exist in the app shell.' : `${missingScreens.length} screen target(s) are missing from critical flows.`,
      ready: navTargetsReady,
      severity: navTargetsReady ? 'info' : 'blocker',
    },
    {
      id: 'bottom_nav',
      title: 'Bottom navigation coverage',
      body: coreBottomNavReady ? 'Core tabs include matches, filters, coach, executive, likes, chat and profile.' : 'One or more high-frequency tabs are not represented in the bottom bar.',
      ready: coreBottomNavReady,
      severity: coreBottomNavReady ? 'info' : 'important',
    },
    {
      id: 'critical_flows',
      title: 'Critical user flows',
      body: releaseCriticalFlowsReady ? 'Onboarding, matching, chat, pricing, safety and support flows are represented.' : 'A release-critical product flow is incomplete.',
      ready: releaseCriticalFlowsReady,
      severity: releaseCriticalFlowsReady ? 'info' : 'blocker',
    },
    {
      id: 'safety_actions',
      title: 'Safety actions',
      body: input.hasSafetyActions ? 'Report, block, unmatch, check-ins and privacy controls are available.' : 'Safety actions must be accessible before release.',
      ready: input.hasSafetyActions,
      severity: input.hasSafetyActions ? 'info' : 'blocker',
    },
    {
      id: 'support',
      title: 'Support flow',
      body: input.hasSupportFlow ? 'Support request flow is available with safety/billing topics.' : 'Support ticket flow is missing.',
      ready: input.hasSupportFlow,
      severity: input.hasSupportFlow ? 'info' : 'important',
    },
    {
      id: 'pricing',
      title: 'Pricing flow',
      body: input.hasPricingFlow ? 'Membership, Spark packs and restore preview are reachable.' : 'Pricing/package actions are not reachable.',
      ready: input.hasPricingFlow,
      severity: input.hasPricingFlow ? 'info' : 'important',
    },
    {
      id: 'responsive',
      title: 'Responsive shell',
      body: input.hasResponsiveShell ? 'Mobile, tablet and desktop preview are constrained to readable widths.' : 'Desktop/tablet layouts need a readable shell.',
      ready: input.hasResponsiveShell,
      severity: input.hasResponsiveShell ? 'info' : 'important',
    },
    {
      id: 'backend',
      title: 'Real backend connection',
      body: input.hasBackendConnected ? 'Backend keys/providers are connected.' : 'Backend/API keys are intentionally left for the final connection step.',
      ready: input.hasBackendConnected,
      severity: input.hasBackendConnected ? 'info' : 'important',
    },
  ];

  const readyItems = items.filter((item) => item.ready).length;
  return {
    score: Math.round((readyItems / items.length) * 100),
    readyItems,
    totalItems: items.length,
    blockers: items.filter((item) => !item.ready && item.severity === 'blocker'),
    important: items.filter((item) => !item.ready && item.severity === 'important'),
    items,
  } satisfies ProductQualitySnapshot;
}
