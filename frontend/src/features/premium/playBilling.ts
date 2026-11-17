/**
 * Google Play purchases for the Android app. The real version is in
 * playBilling.native.ts; on the web nothing here is ever bought, so these
 * are harmless no-ops.
 *
 * Every product is named after its plan code (pro_monthly, boost_5, ...),
 * so the server and the store agree on what was bought.
 */
export type PlayProduct = {
  productId: string;
  /** The price Google shows, in the member's currency. */
  displayPrice: string;
  /** Subscriptions only: the offer Google needs to sell the plan. */
  offerToken: string | null;
  isSubscription: boolean;
};

export type PlayPurchase = {
  productId: string;
  purchaseToken: string;
  /** Hand back to Google after the server has granted it. */
  raw: unknown;
};

export async function connectPlay(): Promise<boolean> {
  return false;
}

export async function loadPlayProducts(_productIds: string[]): Promise<Record<string, PlayProduct>> {
  return {};
}

export async function buyPlayProduct(_product: PlayProduct): Promise<void> {}

/** Listen for purchases Google reports. Returns a function that stops listening. */
export function onPlayPurchase(
  _onPurchase: (purchase: PlayPurchase) => void,
  _onError: (message: string) => void,
): () => void {
  return () => {};
}

/** Tell Google the purchase is handled. A consumable is used up so it can be bought again. */
export async function finishPlayPurchase(_purchase: PlayPurchase, _isConsumable: boolean): Promise<void> {}

/** Let go of the Play connection (on sign-out or when the screen is left). */
export async function disconnectPlay(): Promise<void> {}
