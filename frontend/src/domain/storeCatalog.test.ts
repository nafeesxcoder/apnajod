import { describe, expect, it } from 'vitest';
import { executiveStoreProduct, membershipStoreProduct, sparkStoreProduct, storePlatformForOperatingSystem } from './storeCatalog';

describe('native store catalog', () => {
  it('maps each membership cycle to the same server and provider identifiers', () => {
    expect(membershipStoreProduct('plus', 'annual', 'apple_iap')).toEqual({
      logicalKey: 'membership.plus.annual',
      productKey: 'membership.plus.annual.apple_iap',
      externalProductId: 'com.milaan.app.membership.plus.annual',
      purchaseType: 'subs',
      consumable: false,
    });
  });

  it('marks Spark packs consumable and Executive access subscription-only', () => {
    expect(sparkStoreProduct('spark_15', 'google_play').consumable).toBe(true);
    expect(sparkStoreProduct('spark_15', 'google_play').externalProductId).toBe('com.milaan.app.spark.15');
    expect(executiveStoreProduct('apple_iap').purchaseType).toBe('subs');
  });

  it('refuses store billing on web', () => {
    expect(storePlatformForOperatingSystem('ios')).toBe('apple_iap');
    expect(storePlatformForOperatingSystem('android')).toBe('google_play');
    expect(storePlatformForOperatingSystem('web')).toBeNull();
  });
});
