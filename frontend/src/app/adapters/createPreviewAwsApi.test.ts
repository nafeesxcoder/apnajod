import { describe, expect, it } from 'vitest';

import { createPreviewAwsApi } from './createPreviewAwsApi';

describe('frontend preview AWS adapter', () => {
  it('provides every frontend port without a network or provider SDK', async () => {
    const api = createPreviewAwsApi();
    expect(Object.keys(api).sort()).toEqual(['auth', 'chat', 'couple', 'discovery', 'member', 'notifications', 'payments', 'places', 'trustAndSupport'].sort());
    await expect(api.member.loadBootstrap()).resolves.toMatchObject({ ok: true, data: { onboardingComplete: false } });
    await expect(api.discovery.loadDailyIntroductions({ intent: '', vibes: [], ageMin: 18, ageMax: 99, radiusMiles: 25, cities: [], verifiedOnly: false })).resolves.toEqual({ ok: true, data: [] });
  });

  it('keeps preview chat deterministic and in memory only', async () => {
    const api = createPreviewAwsApi();
    const sent = await api.chat.sendMessage({ clientMessageId: 'client-1', conversationId: 'conversation-1', senderId: 'preview-member', kind: 'text', payload: { text: 'Hello' } });
    expect(sent).toMatchObject({ ok: true, data: { id: 'client-1', deliveryStatus: 'sent' } });
    const history = await api.chat.loadMessages({ conversationId: 'conversation-1' });
    expect(history.ok && history.data.items).toHaveLength(1);
  });

  it('never creates a real charge or reservation in preview mode', async () => {
    const quote = await apiForTest().payments.createReservationQuote({ venueId: 'venue', scheduledAt: new Date().toISOString() });
    expect(quote.ok && quote.data.total.amountMinor).toBe(0);
  });
});

const apiForTest = () => createPreviewAwsApi();
