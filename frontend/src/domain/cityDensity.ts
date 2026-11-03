import { launchCityTargets, type LaunchCityName } from './networkEffects';

export type CityDensityStatus =
  | 'Measurement missing'
  | 'Waitlist only'
  | 'Controlled pilot'
  | 'Healthy pilot'
  | 'Ready to expand';

export type CityLiquidityMeasurement = {
  city: LaunchCityName;
  verifiedActiveMembers: number;
  cohortFloorPercent: number;
  medianEligibleCandidates: number;
  qualifiedIntroductionsPerActive: number;
  replyRatePercent: number;
  meaningfulConversationRatePercent: number;
  acceptedDateRatePercent: number;
  eightWeekRetentionPercent: number;
  safetyIncidentsPer100Dates: number;
  consecutiveHealthyWeeks: number;
  waitlistMembers: number;
  activeAmbassadors: number;
  monthlyEventSeats: number;
};

export type CityDensityGate = {
  id: 'verified_supply' | 'cohort_balance' | 'candidate_liquidity' | 'quality_outcomes' | 'retention' | 'safety' | 'durability';
  title: string;
  ready: boolean;
  body: string;
};

export type CityDensityMarket = CityLiquidityMeasurement & {
  market: string;
  productionVerifiedGoal: number;
  status: CityDensityStatus;
  score: number;
  gates: CityDensityGate[];
  nextAction: string;
};

export type CityDensitySnapshot = {
  liveMetricsConnected: boolean;
  status: 'Source model only' | 'Pilot instrumentation' | 'Expansion ready';
  sourceControlScore: number;
  sourceControlReady: number;
  sourceControlTotal: number;
  score: number;
  markets: CityDensityMarket[];
  readyMarkets: number;
  blockers: string[];
  nextBestStep: string;
};

const thresholds = {
  cohortFloorPercent: 20,
  medianEligibleCandidates: 15,
  qualifiedIntroductionsPerActive: 3,
  replyRatePercent: 45,
  meaningfulConversationRatePercent: 25,
  acceptedDateRatePercent: 8,
  eightWeekRetentionPercent: 35,
  safetyIncidentsPer100Dates: 1.5,
  consecutiveHealthyWeeks: 8,
} as const;

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildGates(measurement: CityLiquidityMeasurement, productionVerifiedGoal: number): CityDensityGate[] {
  return [
    {
      id: 'verified_supply',
      title: 'Verified active supply',
      ready: measurement.verifiedActiveMembers >= productionVerifiedGoal,
      body: `${measurement.verifiedActiveMembers}/${productionVerifiedGoal} verified, recently active members.`,
    },
    {
      id: 'cohort_balance',
      title: 'Balanced preference cohorts',
      ready: measurement.cohortFloorPercent >= thresholds.cohortFloorPercent,
      body: `Smallest reciprocal age, intent, gender and distance cohort is ${measurement.cohortFloorPercent}% of target.`,
    },
    {
      id: 'candidate_liquidity',
      title: 'Useful candidate liquidity',
      ready: measurement.medianEligibleCandidates >= thresholds.medianEligibleCandidates
        && measurement.qualifiedIntroductionsPerActive >= thresholds.qualifiedIntroductionsPerActive,
      body: `${measurement.medianEligibleCandidates} median eligible candidates and ${measurement.qualifiedIntroductionsPerActive.toFixed(1)} qualified introductions per active member/week.`,
    },
    {
      id: 'quality_outcomes',
      title: 'Healthy relationship outcomes',
      ready: measurement.replyRatePercent >= thresholds.replyRatePercent
        && measurement.meaningfulConversationRatePercent >= thresholds.meaningfulConversationRatePercent
        && measurement.acceptedDateRatePercent >= thresholds.acceptedDateRatePercent,
      body: `${measurement.replyRatePercent}% reply · ${measurement.meaningfulConversationRatePercent}% meaningful conversation · ${measurement.acceptedDateRatePercent}% accepted date.`,
    },
    {
      id: 'retention',
      title: 'Eight-week retention',
      ready: measurement.eightWeekRetentionPercent >= thresholds.eightWeekRetentionPercent,
      body: `${measurement.eightWeekRetentionPercent}% of activated members remain healthy and active at week eight.`,
    },
    {
      id: 'safety',
      title: 'Offline safety threshold',
      ready: measurement.safetyIncidentsPer100Dates <= thresholds.safetyIncidentsPer100Dates,
      body: `${measurement.safetyIncidentsPer100Dates.toFixed(1)} substantiated safety incidents per 100 accepted dates.`,
    },
    {
      id: 'durability',
      title: 'Sustained pilot quality',
      ready: measurement.consecutiveHealthyWeeks >= thresholds.consecutiveHealthyWeeks,
      body: `${measurement.consecutiveHealthyWeeks}/${thresholds.consecutiveHealthyWeeks} consecutive healthy weeks.`,
    },
  ];
}

function marketStatus(liveMetricsConnected: boolean, readyGates: number, measurement: CityLiquidityMeasurement): CityDensityStatus {
  if (!liveMetricsConnected) return 'Measurement missing';
  if (measurement.verifiedActiveMembers < 50) return 'Waitlist only';
  if (readyGates === 7) return 'Ready to expand';
  if (readyGates >= 5 && measurement.consecutiveHealthyWeeks >= 4) return 'Healthy pilot';
  return 'Controlled pilot';
}

function marketNextAction(status: CityDensityStatus, measurement: CityLiquidityMeasurement, goal: number) {
  if (status === 'Measurement missing') return 'Connect warehouse-backed city and cohort metrics before opening discovery.';
  if (status === 'Waitlist only') return `Keep discovery closed; verify ${Math.max(0, goal - measurement.verifiedActiveMembers)} more active members and seed balanced cohorts.`;
  if (status === 'Controlled pilot') return 'Throttle weekly introductions and repair the lowest liquidity or outcome gate.';
  if (status === 'Healthy pilot') return 'Hold quality for eight consecutive weeks before expanding reach.';
  return 'Expansion may proceed one adjacent metro at a time with rollback monitoring.';
}

export function buildCityDensitySnapshot(input: {
  liveMetricsConnected: boolean;
  measurements: readonly CityLiquidityMeasurement[];
  metricIngestionReady: boolean;
  privacySuppressionReady: boolean;
  discoveryEnforcementReady: boolean;
  dualApprovalReady: boolean;
  rollbackReady: boolean;
}): CityDensitySnapshot {
  const markets = launchCityTargets.map((target) => {
    const measurement = input.measurements.find((item) => item.city === target.name) ?? {
      city: target.name,
      verifiedActiveMembers: 0,
      cohortFloorPercent: 0,
      medianEligibleCandidates: 0,
      qualifiedIntroductionsPerActive: 0,
      replyRatePercent: 0,
      meaningfulConversationRatePercent: 0,
      acceptedDateRatePercent: 0,
      eightWeekRetentionPercent: 0,
      safetyIncidentsPer100Dates: 0,
      consecutiveHealthyWeeks: 0,
      waitlistMembers: 0,
      activeAmbassadors: 0,
      monthlyEventSeats: 0,
    };
    const gates = buildGates(measurement, target.productionVerifiedGoal);
    const readyGates = gates.filter((gate) => gate.ready).length;
    const status = marketStatus(input.liveMetricsConnected, readyGates, measurement);
    return {
      ...measurement,
      market: target.market,
      productionVerifiedGoal: target.productionVerifiedGoal,
      status,
      score: input.liveMetricsConnected ? clampPercent((readyGates / gates.length) * 100) : 0,
      gates,
      nextAction: marketNextAction(status, measurement, target.productionVerifiedGoal),
    };
  });
  const readyMarkets = markets.filter((market) => market.status === 'Ready to expand').length;
  const blockers = input.liveMetricsConnected
    ? markets.filter((market) => market.status !== 'Ready to expand').map((market) => `${market.city}: ${market.nextAction}`)
    : ['Live member, cohort, outcome, retention, and safety metrics are not connected.'];
  const score = input.liveMetricsConnected
    ? clampPercent(markets.reduce((sum, market) => sum + market.score, 0) / markets.length)
    : 0;
  const sourceControls = [
    input.metricIngestionReady,
    input.privacySuppressionReady,
    input.discoveryEnforcementReady,
    input.dualApprovalReady,
    input.rollbackReady,
  ];
  const sourceControlReady = sourceControls.filter(Boolean).length;

  return {
    liveMetricsConnected: input.liveMetricsConnected,
    status: !input.liveMetricsConnected ? 'Source model only' : readyMarkets === markets.length ? 'Expansion ready' : 'Pilot instrumentation',
    sourceControlScore: clampPercent((sourceControlReady / sourceControls.length) * 100),
    sourceControlReady,
    sourceControlTotal: sourceControls.length,
    score,
    markets,
    readyMarkets,
    blockers,
    nextBestStep: !input.liveMetricsConnected
      ? 'Deploy the density schema, connect consented analytics, and measure one controlled Delhi NCR pilot.'
      : readyMarkets === markets.length
        ? 'Approve one adjacent-market expansion and monitor rollback gates weekly.'
        : 'Keep discovery throttled and improve the lowest failing city cohort gate.',
  };
}

export function resolveLaunchMarket(city: string) {
  const normalized = city.toLowerCase();
  return launchCityTargets.find((target) => target.aliases.some((alias) => normalized.includes(alias)));
}

export const cityDensityThresholds = thresholds;
