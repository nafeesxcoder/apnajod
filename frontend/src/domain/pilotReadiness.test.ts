import { describe, expect, it } from 'vitest';
import { buildPilotReadinessSnapshot, type PilotReadinessInput } from './pilotReadiness';

const emptyInput: PilotReadinessInput = {
  pilotCity: 'Delhi NCR',
  hostedBackendVerified: false,
  authDeliveryVerified: false,
  securityTestsExecuted: false,
  iosDeviceJourneyPassed: false,
  androidDeviceJourneyPassed: false,
  trustOpsStaffed: false,
  incidentDrillPassed: false,
  liquidityWeeksVerified: 0,
  requiredLiquidityWeeks: 8,
  providerSandboxVerified: false,
  observabilityAlertDrillPassed: false,
  publicLegalUrlsVerified: false,
  rollbackDrillPassed: false,
};

describe('controlled pilot readiness', () => {
  it('keeps source-only readiness at zero without live evidence', () => {
    const snapshot = buildPilotReadinessSnapshot(emptyInput);
    expect(snapshot.status).toBe('Source plan only');
    expect(snapshot.evidencePercent).toBe(0);
    expect(snapshot.blockers).toHaveLength(12);
  });

  it('requires consecutive liquidity evidence instead of waitlist size', () => {
    const snapshot = buildPilotReadinessSnapshot({...emptyInput, liquidityWeeksVerified: 7});
    expect(snapshot.gates.find((gate) => gate.id === 'city_liquidity')?.ready).toBe(false);
  });

  it('tracks iOS and Android device evidence separately', () => {
    const snapshot = buildPilotReadinessSnapshot({...emptyInput, iosDeviceJourneyPassed: true});
    expect(snapshot.deviceJourneysPassed).toBe(1);
    expect(snapshot.gates.find((gate) => gate.id === 'android_device_journey')?.ready).toBe(false);
  });

  it('opens the pilot only when every evidence gate passes', () => {
    const snapshot = buildPilotReadinessSnapshot({
      ...emptyInput,
      hostedBackendVerified: true,
      authDeliveryVerified: true,
      securityTestsExecuted: true,
      iosDeviceJourneyPassed: true,
      androidDeviceJourneyPassed: true,
      trustOpsStaffed: true,
      incidentDrillPassed: true,
      liquidityWeeksVerified: 8,
      providerSandboxVerified: true,
      observabilityAlertDrillPassed: true,
      publicLegalUrlsVerified: true,
      rollbackDrillPassed: true,
    });
    expect(snapshot.status).toBe('Ready for controlled city pilot');
    expect(snapshot.evidencePercent).toBe(100);
    expect(snapshot.blockers).toHaveLength(0);
  });
});
