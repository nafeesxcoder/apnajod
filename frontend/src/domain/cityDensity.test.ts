import { describe, expect, it } from 'vitest';
import { buildCityDensitySnapshot, cityDensityThresholds, resolveLaunchMarket, type CityLiquidityMeasurement } from './cityDensity';

const healthyMumbai: CityLiquidityMeasurement = {
  city: 'Mumbai',
  verifiedActiveMembers: 280,
  cohortFloorPercent: 24,
  medianEligibleCandidates: 22,
  qualifiedIntroductionsPerActive: 3.8,
  replyRatePercent: 54,
  meaningfulConversationRatePercent: 31,
  acceptedDateRatePercent: 11,
  eightWeekRetentionPercent: 41,
  safetyIncidentsPer100Dates: 0.8,
  consecutiveHealthyWeeks: 8,
  waitlistMembers: 1160,
  activeAmbassadors: 11,
  monthlyEventSeats: 120,
};

describe('city density operations', () => {
  const controls = { metricIngestionReady: true, privacySuppressionReady: true, discoveryEnforcementReady: true, dualApprovalReady: true, rollbackReady: true };
  it('never treats source-only modeled data as live density', () => {
    const snapshot = buildCityDensitySnapshot({ liveMetricsConnected: false, measurements: [healthyMumbai], ...controls });

    expect(snapshot.status).toBe('Source model only');
    expect(snapshot.score).toBe(0);
    expect(snapshot.readyMarkets).toBe(0);
    expect(snapshot.markets[3]?.status).toBe('Measurement missing');
    expect(snapshot.sourceControlScore).toBe(100);
  });

  it('requires liquidity, outcomes, safety, retention, and eight healthy weeks', () => {
    const snapshot = buildCityDensitySnapshot({ liveMetricsConnected: true, measurements: [healthyMumbai], ...controls });
    const mumbai = snapshot.markets.find((market) => market.city === 'Mumbai');

    expect(mumbai?.status).toBe('Ready to expand');
    expect(mumbai?.gates).toHaveLength(7);
    expect(mumbai?.gates.every((gate) => gate.ready)).toBe(true);
  });

  it('keeps an unsafe or shallow market inside a controlled pilot', () => {
    const snapshot = buildCityDensitySnapshot({
      liveMetricsConnected: true,
      measurements: [{ ...healthyMumbai, safetyIncidentsPer100Dates: 2.4, consecutiveHealthyWeeks: 3 }],
      ...controls,
    });
    const mumbai = snapshot.markets.find((market) => market.city === 'Mumbai');

    expect(mumbai?.status).toBe('Controlled pilot');
    expect(mumbai?.gates.find((gate) => gate.id === 'safety')?.ready).toBe(false);
    expect(mumbai?.gates.find((gate) => gate.id === 'durability')?.ready).toBe(false);
  });

  it('resolves metro aliases without collecting precise coordinates', () => {
    expect(resolveLaunchMarket('Thane, MH')?.name).toBe('Mumbai');
    expect(resolveLaunchMarket('Gurugram, HR')?.name).toBe('Delhi NCR');
    expect(resolveLaunchMarket('Whitefield, Bengaluru')?.name).toBe('Bengaluru');
    expect(resolveLaunchMarket('Shillong, ML')).toBeUndefined();
    expect(cityDensityThresholds.medianEligibleCandidates).toBeGreaterThan(10);
  });
});
