import { describe, expect, it } from 'vitest';
import { buildReleaseReadinessSnapshot, type ReleaseReadinessInput } from './releaseReadiness';

const readyInput: ReleaseReadinessInput = {
  backendConnected: true,
  paymentsConnected: true,
  placesProviderConnected: true,
  pushNotificationsConnected: true,
  observabilityConnected: true,
  hasStoreAssets: true,
  hasStoreListing: true,
  hasStoreReviewAccess: true,
  hasProductionDemoGuard: true,
  hasPrivacyPolicy: true,
  hasTerms: true,
  hasCommunityGuidelines: true,
  hasPolicyCompliance: true,
  hasDataSafety: true,
  hasAgeGate: true,
  hasDataDeletion: true,
  hasSafetyOperations: true,
  hasAbuseFraudProtection: true,
  hasProductQA: true,
  hasInteractionQA: true,
};

describe('release readiness', () => {
  it('marks a fully connected release as store ready', () => {
    const snapshot = buildReleaseReadinessSnapshot(readyInput);
    expect(snapshot.storeReady).toBe(true);
    expect(snapshot.previewReady).toBe(true);
    expect(snapshot.storeScore).toBe(100);
    expect(snapshot.finalConnection).toEqual([]);
  });

  it('allows preview readiness while final providers are still pending', () => {
    const snapshot = buildReleaseReadinessSnapshot({
      ...readyInput,
      backendConnected: false,
      paymentsConnected: false,
      placesProviderConnected: false,
      pushNotificationsConnected: false,
      observabilityConnected: false,
    });

    expect(snapshot.previewReady).toBe(true);
    expect(snapshot.storeReady).toBe(false);
    expect(snapshot.blockers).toEqual([]);
    expect(snapshot.finalConnection.map((gate) => gate.id)).toEqual([
      'backend_connection',
      'payments_connection',
      'places_provider',
      'push_notifications',
      'observability_connection',
    ]);
  });

  it('blocks release when legal/privacy basics are missing', () => {
    const snapshot = buildReleaseReadinessSnapshot({
      ...readyInput,
      hasPrivacyPolicy: false,
      hasTerms: false,
    });

    expect(snapshot.previewReady).toBe(false);
    expect(snapshot.storeReady).toBe(false);
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(['privacy_policy', 'terms_guidelines']);
  });

  it('treats age gate as store critical for a dating app', () => {
    const snapshot = buildReleaseReadinessSnapshot({
      ...readyInput,
      hasAgeGate: false,
    });

    expect(snapshot.storeBlockers.some((gate) => gate.id === 'age_gate')).toBe(true);
  });

  it('treats reviewer access and demo guard as store critical', () => {
    const snapshot = buildReleaseReadinessSnapshot({
      ...readyInput,
      hasStoreReviewAccess: false,
      hasProductionDemoGuard: false,
    });

    expect(snapshot.storeReady).toBe(false);
    expect(snapshot.storeBlockers.map((gate) => gate.id)).toEqual(['store_review_access', 'production_demo_guard']);
  });

  it('treats dating policy compliance as store critical', () => {
    const snapshot = buildReleaseReadinessSnapshot({
      ...readyInput,
      hasPolicyCompliance: false,
    });

    expect(snapshot.storeBlockers.some((gate) => gate.id === 'dating_policy_compliance')).toBe(true);
  });

  it('treats abuse and fraud protection as store critical', () => {
    const snapshot = buildReleaseReadinessSnapshot({
      ...readyInput,
      hasAbuseFraudProtection: false,
    });

    expect(snapshot.storeReady).toBe(false);
    expect(snapshot.storeBlockers.some((gate) => gate.id === 'abuse_fraud_protection')).toBe(true);
  });
});
