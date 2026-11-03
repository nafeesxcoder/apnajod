export type StoreReviewEnvironment = 'development' | 'preview' | 'production' | string;

export type StoreReviewInput = {
  appEnvironment: StoreReviewEnvironment;
  backendMode: 'demo' | 'aws' | 'missing' | string;
  demoOtpFallbackAllowed: boolean;
  reviewerAccessConfigured: boolean;
  reviewerAccessReference?: string;
  supportContactConfigured: boolean;
  legalUrlsPublished: boolean;
};

export type StoreReviewItem = {
  id: string;
  title: string;
  body: string;
  ready: boolean;
  storeCritical: boolean;
};

export type StoreReviewSnapshot = {
  ready: boolean;
  score: number;
  readyCount: number;
  total: number;
  reviewerInstructions: string[];
  blockers: StoreReviewItem[];
  items: StoreReviewItem[];
};

export function buildStoreReviewSnapshot(input: StoreReviewInput): StoreReviewSnapshot {
  const isProduction = input.appEnvironment === 'production';
  const hasReviewerAccess = input.reviewerAccessConfigured && Boolean(input.reviewerAccessReference);
  const productionDemoGuardReady = !isProduction || !input.demoOtpFallbackAllowed;
  const productionBackendReady = !isProduction || input.backendMode === 'aws';

  const items: StoreReviewItem[] = [
    {
      id: 'reviewer_credentials',
      title: 'Reviewer login credentials',
      body: hasReviewerAccess
        ? 'Reviewer access is configured in the protected store-console handoff.'
        : 'Create a review account in the real backend and place its access details only in protected store-console notes.',
      ready: hasReviewerAccess,
      storeCritical: true,
    },
    {
      id: 'review_notes',
      title: 'Review notes',
      body: input.supportContactConfigured
        ? 'Protected reviewer notes include support routing, demo path and safety feature instructions.'
        : 'Configure the reviewed support contact in protected store-console notes before submission.',
      ready: input.supportContactConfigured,
      storeCritical: true,
    },
    {
      id: 'production_demo_guard',
      title: 'Production demo guard',
      body: productionDemoGuardReady
        ? 'Demo OTP fallback is not allowed in production.'
        : 'Production cannot ship with preview OTP fallback enabled.',
      ready: productionDemoGuardReady,
      storeCritical: true,
    },
    {
      id: 'production_backend',
      title: 'Production backend mode',
      body: productionBackendReady
        ? 'Production mode requires real backend auth/data.'
        : 'Production release is blocked until the AWS API adapter is active.',
      ready: productionBackendReady,
      storeCritical: true,
    },
    {
      id: 'legal_urls',
      title: 'Legal URLs',
      body: input.legalUrlsPublished
        ? 'Privacy, terms and support URLs are ready to paste into store review.'
        : 'Publish privacy policy, terms and support URLs over HTTPS before submission.',
      ready: input.legalUrlsPublished,
      storeCritical: true,
    },
  ];

  const readyCount = items.filter((item) => item.ready).length;
  const blockers = items.filter((item) => item.storeCritical && !item.ready);
  const reviewerInstructions = [
    input.reviewerAccessReference
      ? `Protected access reference: ${input.reviewerAccessReference}`
      : 'Protected access reference: not configured',
    'Credentials and OTPs belong only in App Store Connect/Play Console reviewer notes, never in the app bundle.',
    'Test path: complete onboarding → open Matches → view profile → send interest → answer icebreaker → open Chat.',
    'Safety path: open chat menu → Report/Block/Unmatch → Profile → Safety Center → Trust Ops Preview.',
    'Payments: use preview checkout only until store billing is connected.',
  ];

  return {
    ready: blockers.length === 0,
    score: Math.round((readyCount / items.length) * 100),
    readyCount,
    total: items.length,
    reviewerInstructions,
    blockers,
    items,
  };
}
