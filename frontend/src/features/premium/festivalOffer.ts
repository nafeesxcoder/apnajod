/**
 * The admin's festival offer (say 50% off) is sold through Google Play, which
 * only charges what the Play Console says. So each subscription needs an
 * offer made there with the id festival<percent> - festival50 for 50% off.
 * The app uses that offer while the admin's offer is on; if Play has no such
 * offer, the app shows the full price and no "% off", so nobody is promised
 * a discount Google will not give.
 */
export function festivalOfferId(percent: number | null | undefined): string | null {
  return percent ? `festival${Math.round(percent)}` : null;
}

type WithOffers = { offers?: Record<string, { token: string; displayPrice: string }> } | undefined;

/** The Play offer for this festival %, on this product, if Play has it. */
export function festivalOffer(product: WithOffers, percent: number | null | undefined) {
  const id = festivalOfferId(percent);
  return id ? product?.offers?.[id] ?? null : null;
}
