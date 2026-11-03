import type { BillingCycle, MembershipPlanId, SparkPack } from './monetization';

export type StorePlatform = 'apple_iap' | 'google_play';
export type StoreProductSelection = {
  logicalKey: string;
  productKey: string;
  externalProductId: string;
  purchaseType: 'subs' | 'in-app';
  consumable: boolean;
};

const externalId = (logicalKey: string) => `com.milaan.app.${logicalKey}`;

export function membershipStoreProduct(planId: MembershipPlanId, billing: BillingCycle, platform: StorePlatform): StoreProductSelection {
  const logicalKey = `membership.${planId}.${billing}`;
  return { logicalKey, productKey: `${logicalKey}.${platform}`, externalProductId: externalId(logicalKey), purchaseType: 'subs', consumable: false };
}

export function sparkStoreProduct(packId: SparkPack['id'], platform: StorePlatform): StoreProductSelection {
  const logicalKey = `spark.${packId.slice('spark_'.length)}`;
  return { logicalKey, productKey: `${logicalKey}.${platform}`, externalProductId: externalId(logicalKey), purchaseType: 'in-app', consumable: true };
}

export function executiveStoreProduct(platform: StorePlatform): StoreProductSelection {
  const logicalKey = 'executive.annual';
  return { logicalKey, productKey: `${logicalKey}.${platform}`, externalProductId: externalId(logicalKey), purchaseType: 'subs', consumable: false };
}

export function storePlatformForOperatingSystem(os: string): StorePlatform | null {
  if (os === 'ios') return 'apple_iap';
  if (os === 'android') return 'google_play';
  return null;
}

