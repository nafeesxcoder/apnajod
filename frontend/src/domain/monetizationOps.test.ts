import { describe, expect, it } from 'vitest';
import { buildMonetizationOperationsSnapshot, calculateUnitEconomics, canGrantEntitlement, canTransitionPurchase, commerceRailFor, previewEntitlementAllowed } from './monetizationOps';

describe('monetization operations', () => {
  it('keeps digital products on store billing and physical commerce on the processor rail', () => {
    expect(commerceRailFor('membership', 'ios')).toBe('apple_iap');
    expect(commerceRailFor('spark_pack', 'android')).toBe('google_play');
    expect(commerceRailFor('date_reservation', 'web')).toBe('real_world_processor');
  });

  it('permits only explicit purchase state transitions', () => {
    expect(canTransitionPurchase('pending_store', 'verified')).toBe(true);
    expect(canTransitionPurchase('active', 'grace_period')).toBe(true);
    expect(canTransitionPurchase('refunded', 'active')).toBe(false);
    expect(canTransitionPurchase('created', 'active')).toBe(false);
  });

  it('never grants a client-only or duplicate entitlement', () => {
    expect(canGrantEntitlement({ status: 'verified', serverVerified: true, transactionIdPresent: true, duplicateTransaction: false })).toBe(true);
    expect(canGrantEntitlement({ status: 'active', serverVerified: false, transactionIdPresent: true, duplicateTransaction: false })).toBe(false);
    expect(canGrantEntitlement({ status: 'verified', serverVerified: true, transactionIdPresent: true, duplicateTransaction: true })).toBe(false);
  });

  it('reports contribution margin after every material variable cost', () => {
    expect(calculateUnitEconomics({ grossRevenuePaise: 10000, storeAndProcessorFeesPaise: 1500, taxesPaise: 500, refundsPaise: 300, chargebacksPaise: 200, marketplaceCostPaise: 1000, supportCostPaise: 500, acquisitionCostPaise: 2500 })).toEqual({ deductionsPaise: 4000, contributionMarginPaise: 6000, contributionMarginPercent: 60, afterAcquisitionPaise: 3500 });
  });

  it('keeps readiness at zero without real receipts even when source controls exist', () => {
    const snapshot = buildMonetizationOperationsSnapshot({
      environment: 'preview', liveReceiptCount: 0, verifiedReceiptCount: 0, activeEntitlementCount: 0,
      unresolvedRefundCount: 0, unresolvedChargebackCount: 0, appleProviderConnected: false,
      googleProviderConnected: false, realWorldProcessorConnected: false, webhookSignatureVerificationReady: true,
      immutableLedgerReady: true, restoreReady: true, gracePeriodReady: true, refundWorkflowReady: true,
      taxConfigurationReady: false, fraudReviewReady: true, financeReconciliationReady: false,
      catalogVerificationReady: true, renewalOwnershipReady: true, restoreSessionReady: true,
      boundedReversalReady: true, refundAuditReady: true, financeProvenanceReady: true,
      protectedFreeCapabilitiesReady: true,
      unitEconomics: { grossRevenuePaise: 0, storeAndProcessorFeesPaise: 0, taxesPaise: 0, refundsPaise: 0, chargebacksPaise: 0, marketplaceCostPaise: 0, supportCostPaise: 0, acquisitionCostPaise: 0 },
    });
    expect(snapshot.status).toBe('Source model only');
    expect(snapshot.evidencePercent).toBe(0);
    expect(snapshot.liveReceiptCount).toBe(0);
    expect(snapshot.sourceControlScore).toBe(10);
  });

  it('forbids preview entitlement changes in production', () => {
    expect(previewEntitlementAllowed('preview')).toBe(true);
    expect(previewEntitlementAllowed('production')).toBe(false);
  });
});
