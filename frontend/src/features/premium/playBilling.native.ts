/**
 * Google Play purchases on the Android app, through expo-iap.
 *
 * The flow:
 * 1. loadPlayProducts() asks Google for the prices of our products.
 * 2. buyPlayProduct() opens Google's payment sheet (UPI, card, Google Pay).
 * 3. onPlayPurchase() gets the purchase. PremiumScreen sends the token to
 *    our server, which checks it with Google.
 * 4. finishPlayPurchase() tells Google it is handled, after the server said yes.
 *
 * Products only exist once they are created in the Play Console with the
 * same ids as the plan codes. Until then loadPlayProducts() returns nothing
 * and the Premium screen says payments are not open yet.
 */
import { Platform } from "react-native";
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
} from "expo-iap";

import type { PlayProduct, PlayPurchase } from "./playBilling";

let connected = false;

export async function connectPlay(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  if (!connected) {
    try {
      connected = !!(await initConnection());
    } catch {
      connected = false;
    }
  }
  return connected;
}

export async function loadPlayProducts(productIds: string[]): Promise<Record<string, PlayProduct>> {
  if (!productIds.length || !(await connectPlay())) return {};
  const found: Record<string, PlayProduct> = {};
  try {
    const subs = await fetchProducts({ skus: productIds, type: "subs" });
    for (const item of subs ?? []) {
      if (!("subscriptionOffers" in item)) continue;
      const offer = item.subscriptionOffers?.[0];
      found[item.id] = {
        productId: item.id,
        displayPrice: item.displayPrice,
        offerToken: offer?.offerTokenAndroid ?? null,
        isSubscription: true,
      };
    }
    const packs = await fetchProducts({ skus: productIds, type: "in-app" });
    for (const item of packs ?? []) {
      if ("subscriptionOffers" in item) continue;
      found[item.id] = {
        productId: item.id,
        displayPrice: item.displayPrice,
        offerToken: null,
        isSubscription: false,
      };
    }
  } catch {
    return found;
  }
  return found;
}

export async function buyPlayProduct(product: PlayProduct): Promise<void> {
  if (product.isSubscription) {
    await requestPurchase({
      type: "subs",
      request: {
        google: {
          skus: [product.productId],
          subscriptionOffers: product.offerToken
            ? [{ sku: product.productId, offerToken: product.offerToken }]
            : [],
        },
      },
    });
    return;
  }
  await requestPurchase({
    type: "in-app",
    request: { google: { skus: [product.productId] } },
  });
}

export function onPlayPurchase(
  onPurchase: (purchase: PlayPurchase) => void,
  onError: (message: string) => void,
): () => void {
  const updated = purchaseUpdatedListener((purchase: Purchase) => {
    const token = purchase.purchaseToken ?? null;
    if (!token) return;
    onPurchase({ productId: purchase.productId, purchaseToken: token, raw: purchase });
  });
  const failed = purchaseErrorListener((error: { message: string }) => onError(error.message));
  return () => {
    updated.remove();
    failed.remove();
  };
}

export async function finishPlayPurchase(purchase: PlayPurchase, isConsumable: boolean): Promise<void> {
  try {
    await finishTransaction({ purchase: purchase.raw as Purchase, isConsumable });
  } catch {
    // Already finished (for example a consumable the server used up). Nothing to do.
  }
}

export async function disconnectPlay(): Promise<void> {
  if (!connected) return;
  connected = false;
  try {
    await endConnection();
  } catch {
    // Already closed.
  }
}
