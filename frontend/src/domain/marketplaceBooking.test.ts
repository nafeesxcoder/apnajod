import { describe, expect, it } from 'vitest';
import { bothMembersAccepted, calculateMarketplaceRefund, canTransitionMarketplaceBooking, isMarketplaceQuoteFresh, marketplaceReconciliationHealthy } from './marketplaceBooking';

describe('marketplace booking operations', () => {
  it('allows only explicit booking state transitions', () => {
    expect(canTransitionMarketplaceBooking('quote_ready', 'awaiting_match_acceptance')).toBe(true);
    expect(canTransitionMarketplaceBooking('quote_ready', 'confirmed')).toBe(false);
    expect(canTransitionMarketplaceBooking('confirmed', 'awaiting_payment')).toBe(false);
  });

  it('requires an unexpired recently synced quote', () => {
    const now = new Date('2026-07-16T18:00:00Z');
    expect(isMarketplaceQuoteFresh('2026-07-16T18:10:00Z', '2026-07-16T17:50:00Z', now)).toBe(true);
    expect(isMarketplaceQuoteFresh('2026-07-16T17:59:00Z', '2026-07-16T17:50:00Z', now)).toBe(false);
    expect(isMarketplaceQuoteFresh('2026-07-16T18:10:00Z', '2026-07-16T17:40:00Z', now)).toBe(false);
  });

  it('requires two distinct match members to accept', () => {
    expect(bothMembersAccepted(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(bothMembersAccepted(['a', 'b'], ['a'])).toBe(false);
    expect(bothMembersAccepted(['a', 'a'], ['a'])).toBe(false);
  });

  it('calculates full, partial, and no-refund outcomes', () => {
    const base = { amountPaise: 20000, cancellationCutoffAt: '2026-07-20T18:00:00Z' };
    expect(calculateMarketplaceRefund({ ...base, cancelledAt: '2026-07-19T18:00:00Z' })).toMatchObject({ kind: 'full', amountPaise: 20000 });
    expect(calculateMarketplaceRefund({ ...base, cancelledAt: '2026-07-21T18:00:00Z', partialRefundPercent: 50 })).toMatchObject({ kind: 'partial', amountPaise: 10000 });
    expect(calculateMarketplaceRefund({ ...base, cancelledAt: '2026-07-21T18:00:00Z', partialRefundPercent: 0 })).toMatchObject({ kind: 'none', amountPaise: 0 });
    expect(calculateMarketplaceRefund({ ...base, cancelledAt: '2026-07-21T18:00:00Z', providerFailed: true })).toMatchObject({ kind: 'full', amountPaise: 20000 });
  });

  it('detects provider/payment reconciliation mismatches', () => {
    expect(marketplaceReconciliationHealthy({ orderAmountPaise: 1000, paymentAmountPaise: 1200, orderStatus: 'confirmed', providerConfirmed: true, paymentCaptured: true })).toBe(false);
    expect(marketplaceReconciliationHealthy({ orderAmountPaise: 1000, paymentAmountPaise: 1000, orderStatus: 'confirmed', providerConfirmed: true, paymentCaptured: true })).toBe(true);
    expect(marketplaceReconciliationHealthy({ orderAmountPaise: 1000, paymentAmountPaise: 1000, orderStatus: 'provider_confirming', providerConfirmed: false, paymentCaptured: true })).toBe(false);
  });
});
