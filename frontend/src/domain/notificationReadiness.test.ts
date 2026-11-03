import { describe, expect, it } from 'vitest';
import { buildNotificationReadinessSnapshot, type NotificationReadinessInput } from './notificationReadiness';

const readyInput: NotificationReadinessInput = {
  appEnvironment: 'production',
  backendConnected: true,
  notificationTableReady: true,
  pushTokenStorageReady: true,
  realtimeNotificationsReady: true,
  profileViewThresholdReady: true,
  matchTriggersReady: true,
  sparkAlertsReady: true,
  dateReminderReady: true,
  safetyAlertsReady: true,
  supportAlertsReady: true,
  memberPreferencesReady: true,
  quietHoursReady: true,
  deepLinkRoutesReady: true,
  pushProviderConfigured: true,
  serverPushSecretsReady: true,
  rateLimitsReady: true,
  physicalDeviceTested: true,
};

describe('notification readiness', () => {
  it('keeps preview notification work honest when push provider and device QA are pending', () => {
    const snapshot = buildNotificationReadinessSnapshot({
      ...readyInput,
      appEnvironment: 'preview',
      pushProviderConfigured: false,
      serverPushSecretsReady: false,
      physicalDeviceTested: false,
    });

    expect(snapshot.status).toBe('Final push provider pending');
    expect(snapshot.eventCoverage).toBe(100);
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'push_provider',
      'production_qa',
    ]));
  });

  it('blocks launch when notification schema and event triggers are incomplete', () => {
    const snapshot = buildNotificationReadinessSnapshot({
      ...readyInput,
      backendConnected: false,
      notificationTableReady: false,
      pushTokenStorageReady: false,
      realtimeNotificationsReady: false,
      sparkAlertsReady: false,
      rateLimitsReady: false,
    });

    expect(snapshot.status).toBe('Notification setup needed');
    expect(snapshot.blockers.map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'schema_tokens',
      'event_triggers',
      'rate_limits',
    ]));
  });

  it('passes when schema, provider, triggers, safety alerts and physical device QA are ready', () => {
    const snapshot = buildNotificationReadinessSnapshot(readyInput);

    expect(snapshot.status).toBe('Ready for notification launch');
    expect(snapshot.score).toBe(100);
    expect(snapshot.blockerCount).toBe(0);
  });
});
