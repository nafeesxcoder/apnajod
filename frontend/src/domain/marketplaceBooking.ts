export type MarketplaceBookingStatus =
  | 'quote_ready'
  | 'awaiting_match_acceptance'
  | 'awaiting_payment'
  | 'payment_authorized'
  | 'provider_confirming'
  | 'confirmed'
  | 'cancellation_requested'
  | 'cancelled'
  | 'partially_refunded'
  | 'refunded'
  | 'failed'
  | 'support_required';

export type MarketplaceBookingEvent = {
  status: MarketplaceBookingStatus;
  title: string;
  body: string;
};

export type MarketplaceRefundResult = {
  kind: 'full' | 'partial' | 'none';
  amountPaise: number;
  reason: string;
};

const transitions: Record<MarketplaceBookingStatus, readonly MarketplaceBookingStatus[]> = {
  quote_ready: ['awaiting_match_acceptance', 'failed'],
  awaiting_match_acceptance: ['awaiting_payment', 'cancelled', 'failed'],
  awaiting_payment: ['payment_authorized', 'cancelled', 'failed'],
  payment_authorized: ['provider_confirming', 'refunded', 'support_required'],
  provider_confirming: ['confirmed', 'refunded', 'failed', 'support_required'],
  confirmed: ['cancellation_requested', 'support_required'],
  cancellation_requested: ['cancelled', 'partially_refunded', 'refunded', 'support_required'],
  cancelled: [],
  partially_refunded: [],
  refunded: [],
  failed: [],
  support_required: ['cancelled', 'partially_refunded', 'refunded'],
};

export function canTransitionMarketplaceBooking(from: MarketplaceBookingStatus, to: MarketplaceBookingStatus) {
  return transitions[from].includes(to);
}

export function isMarketplaceQuoteFresh(expiresAt: string, providerSyncedAt: string, now = new Date()) {
  const expiry = Date.parse(expiresAt);
  const synced = Date.parse(providerSyncedAt);
  return Number.isFinite(expiry) && Number.isFinite(synced) && expiry > now.getTime() && now.getTime() - synced <= 15 * 60 * 1000;
}

export function bothMembersAccepted(memberIds: readonly string[], acceptedMemberIds: readonly string[]) {
  const uniqueMembers = new Set(memberIds);
  const uniqueAccepted = new Set(acceptedMemberIds);
  return uniqueMembers.size === 2 && [...uniqueMembers].every((id) => uniqueAccepted.has(id));
}

export function calculateMarketplaceRefund(input: {
  amountPaise: number;
  cancellationCutoffAt: string;
  cancelledAt: string;
  providerFailed?: boolean;
  partialRefundPercent?: number;
}): MarketplaceRefundResult {
  if (input.providerFailed || Date.parse(input.cancelledAt) <= Date.parse(input.cancellationCutoffAt)) {
    return { kind: 'full', amountPaise: input.amountPaise, reason: input.providerFailed ? 'Provider could not confirm the reservation.' : 'Cancelled before the free-cancellation cutoff.' };
  }
  const partialPercent = Math.max(0, Math.min(100, input.partialRefundPercent ?? 50));
  if (partialPercent > 0) {
    return { kind: 'partial', amountPaise: Math.round(input.amountPaise * partialPercent / 100), reason: `Late cancellation qualifies for a ${partialPercent}% refund.` };
  }
  return { kind: 'none', amountPaise: 0, reason: 'The provider cancellation window has closed.' };
}

export function buildMarketplaceBookingTimeline(status: MarketplaceBookingStatus): MarketplaceBookingEvent[] {
  const order = ['quote_ready', 'awaiting_match_acceptance', 'awaiting_payment', 'provider_confirming', 'confirmed'] as const satisfies readonly MarketplaceBookingStatus[];
  const activeIndex = Math.max(0, order.findIndex((item) => item === status));
  const copy: Record<(typeof order)[number], Omit<MarketplaceBookingEvent, 'status'>> = {
    quote_ready: { title: 'Availability checked', body: 'Price and capacity are held for a short time.' },
    awaiting_match_acceptance: { title: 'Both people accept', body: 'No payment is prepared until both members agree.' },
    awaiting_payment: { title: 'Secure payment', body: 'The server rechecks the total and prepares payment.' },
    provider_confirming: { title: 'Provider confirmation', body: 'The venue confirms every itinerary item.' },
    confirmed: { title: 'Ready for your date', body: 'Receipt, policies and support live in one itinerary.' },
  };
  return order.map((item, index) => ({ status: item, ...copy[item], body: `${index < activeIndex ? 'Complete. ' : index === activeIndex ? 'Current step. ' : ''}${copy[item].body}` }));
}

export function marketplaceReconciliationHealthy(input: {
  orderAmountPaise: number;
  paymentAmountPaise: number;
  orderStatus: MarketplaceBookingStatus;
  providerConfirmed: boolean;
  paymentCaptured: boolean;
}) {
  if (input.orderAmountPaise !== input.paymentAmountPaise) return false;
  if (input.orderStatus === 'confirmed') return input.providerConfirmed && input.paymentCaptured;
  if (input.paymentCaptured && !input.providerConfirmed) return false;
  return true;
}
