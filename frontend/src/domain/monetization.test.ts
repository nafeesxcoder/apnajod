import { describe, expect, it } from 'vitest';
import {
  annualSavingsPaise,
  annualSavingsLabel,
  billingPeriodLabel,
  buildPaymentEntitlementSnapshot,
  buildRestorePreview,
  checkoutSteps,
  formatMoney,
  isStoreCompliantProduct,
  membershipEntitlementSummary,
  membershipPlans,
  membershipPriceLabel,
  sparkPacks,
  sparkUnitPricePaise,
} from './monetization';

describe('monetization catalog', () => {
  it('formats membership prices and annual savings consistently', () => {
    const plus = membershipPlans.find((plan) => plan.id === 'plus');
    expect(plus).toBeTruthy();
    expect(membershipPriceLabel(plus!, 'monthly')).toBe('₹899');
    expect(membershipPriceLabel(plus!, 'annual')).toBe('₹8,990');
    expect(billingPeriodLabel('annual')).toBe('/ year');
    expect(annualSavingsPaise(plus!)).toBe(179800);
    expect(annualSavingsLabel(plus!)).toBe('Save ₹1,798');
  });

  it('keeps entitlements clear and not swipe-gamified', () => {
    const elite = membershipPlans.find((plan) => plan.id === 'elite')!;
    expect(membershipEntitlementSummary(elite)).toContain('15 curated matches/day');
    expect(membershipEntitlementSummary(elite)).toContain('5 bonus Sparks/week');
  });

  it('tracks Spark pack value without negative or fake pricing', () => {
    expect(formatMoney(sparkPacks[0]!.pricePaise)).toBe('₹99');
    expect(sparkUnitPricePaise(sparkPacks[1]!)).toBe(1660);
    expect(sparkPacks.some((pack) => pack.bestValue)).toBe(true);
  });

  it('uses store-compliant checkout and restore preview language', () => {
    expect(checkoutSteps('spark_pack')).toEqual(['Select', 'Store billing', 'Add Sparks', 'Restore anytime']);
    expect(checkoutSteps('executive_application', true)).toEqual(['Apply', 'Verify', 'Approve', 'Bill yearly']);
    expect(buildRestorePreview([])).toContain('No previous purchases');
    expect(buildRestorePreview(['Milaan Plus'])).toContain('Restore ready');
    expect(isStoreCompliantProduct('membership')).toBe(true);
  });

  it('keeps preview billing honest until store products and receipts are connected', () => {
    const snapshot = buildPaymentEntitlementSnapshot({
      billingMode: 'preview',
      appEnvironment: 'preview',
      paymentsConfigured: false,
      membershipPlanCount: membershipPlans.length,
      sparkPackCount: sparkPacks.length,
      hasExecutivePlan: true,
      checkoutPreviewReady: true,
      storeProductIdsReady: false,
      receiptVerificationReady: false,
      restorePurchaseReady: true,
      entitlementLedgerReady: true,
      featureLimitsReady: true,
      subscriptionCopyReady: true,
      appleGoogleDisclosureReady: true,
      reservationPaymentsReady: false,
      webhookReconciliationReady: false,
      refundSupportReady: true,
      abuseControlsReady: true,
      productionBillingLocked: false,
    });

    expect(snapshot.status).toBe('Final payment providers pending');
    expect(snapshot.paidProductCount).toBe(7);
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'store_products',
      'receipt_verification',
      'real_world_payments',
      'production_lock',
    ]));
  });

  it('passes when store billing, receipts, real-world payments and production lock are ready', () => {
    const snapshot = buildPaymentEntitlementSnapshot({
      billingMode: 'store',
      appEnvironment: 'production',
      paymentsConfigured: true,
      membershipPlanCount: 3,
      sparkPackCount: 3,
      hasExecutivePlan: true,
      checkoutPreviewReady: true,
      storeProductIdsReady: true,
      receiptVerificationReady: true,
      restorePurchaseReady: true,
      entitlementLedgerReady: true,
      featureLimitsReady: true,
      subscriptionCopyReady: true,
      appleGoogleDisclosureReady: true,
      reservationPaymentsReady: true,
      webhookReconciliationReady: true,
      refundSupportReady: true,
      abuseControlsReady: true,
      productionBillingLocked: true,
    });

    expect(snapshot.status).toBe('Ready for paid launch');
    expect(snapshot.score).toBe(100);
    expect(snapshot.blockers).toHaveLength(0);
  });
});
