import { describe, expect, it } from 'vitest';
import { sanitizeLaunchAnalyticsProperties } from './previewAnalytics';

describe('launch analytics privacy boundary', () => {
  it('keeps only allowlisted non-identifying scalar properties', () => {
    expect(sanitizeLaunchAnalyticsProperties({
      screen_key: 'Pricing Screen',
      enabled: true,
      name: 'Private member name',
      message_body: 'private chat',
      latitude: 36.7378,
      unknown: 'discard me',
    })).toEqual({ screen_key: 'pricing_screen', enabled: true });
  });

  it('normalizes legacy safe event fields without leaking receipt data', () => {
    expect(sanitizeLaunchAnalyticsProperties({
      item: 'Golden Rose',
      coins: 15,
      transaction_id: 'provider-secret',
      token: 'receipt-token',
    })).toEqual({ item_key: 'golden_rose', value_bucket: '15' });
  });

  it('bounds values before they can enter the offline queue', () => {
    const properties = sanitizeLaunchAnalyticsProperties({ error_code: 'Store Failure '.repeat(20), count_bucket: '4+' });
    expect(String(properties.error_code).length).toBeLessThanOrEqual(80);
    expect(properties.count_bucket).toBe('4+');
  });
});
