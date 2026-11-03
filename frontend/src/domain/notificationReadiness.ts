export type NotificationLaunchStatus = 'Ready for notification launch' | 'Final push provider pending' | 'Notification setup needed';

export type NotificationGateId =
  | 'schema_tokens'
  | 'permission_preferences'
  | 'event_triggers'
  | 'push_provider'
  | 'deep_links'
  | 'rate_limits'
  | 'safety_support_alerts'
  | 'production_qa';

export type NotificationReadinessInput = {
  appEnvironment: string;
  backendConnected: boolean;
  notificationTableReady: boolean;
  pushTokenStorageReady: boolean;
  realtimeNotificationsReady: boolean;
  profileViewThresholdReady: boolean;
  matchTriggersReady: boolean;
  sparkAlertsReady: boolean;
  dateReminderReady: boolean;
  safetyAlertsReady: boolean;
  supportAlertsReady: boolean;
  memberPreferencesReady: boolean;
  quietHoursReady: boolean;
  deepLinkRoutesReady: boolean;
  pushProviderConfigured: boolean;
  serverPushSecretsReady: boolean;
  rateLimitsReady: boolean;
  physicalDeviceTested: boolean;
};

export type NotificationGate = {
  id: NotificationGateId;
  title: string;
  body: string;
  ready: boolean;
  started: boolean;
  nextStep: string;
};

export type NotificationReadinessSnapshot = {
  status: NotificationLaunchStatus;
  score: number;
  readyCount: number;
  total: number;
  eventCoverage: number;
  blockerCount: number;
  blockers: NotificationGate[];
  gates: NotificationGate[];
  nextBestStep: string;
};

function gateScore(gate: NotificationGate) {
  if (gate.ready) return 100;
  if (gate.started) return 55;
  return 0;
}

export function buildNotificationReadinessSnapshot(input: NotificationReadinessInput): NotificationReadinessSnapshot {
  const schemaReady = input.backendConnected && input.notificationTableReady && input.pushTokenStorageReady && input.realtimeNotificationsReady;
  const preferenceReady = input.memberPreferencesReady && input.quietHoursReady && input.profileViewThresholdReady;
  const eventFlags = [
    input.profileViewThresholdReady,
    input.matchTriggersReady,
    input.sparkAlertsReady,
    input.dateReminderReady,
    input.safetyAlertsReady,
    input.supportAlertsReady,
  ];
  const eventCoverage = Math.round((eventFlags.filter(Boolean).length / eventFlags.length) * 100);
  const eventTriggersReady = eventCoverage >= 90 && input.matchTriggersReady && input.sparkAlertsReady;
  const pushProviderReady = input.pushProviderConfigured && input.serverPushSecretsReady;
  const deepLinksReady = input.deepLinkRoutesReady && input.memberPreferencesReady;
  const rateLimitsReady = input.rateLimitsReady && input.quietHoursReady;
  const safetySupportReady = input.safetyAlertsReady && input.supportAlertsReady;
  const productionQaReady = input.physicalDeviceTested && pushProviderReady && input.appEnvironment === 'production';

  const gates: NotificationGate[] = [
    {
      id: 'schema_tokens',
      title: 'Notification schema and push tokens',
      body: schemaReady
        ? 'member_notifications, push_tokens and realtime notification stream are backend-ready.'
        : `Backend ${input.backendConnected ? 'connected' : 'pending'} · notifications table ${input.notificationTableReady ? 'ready' : 'pending'} · push token storage ${input.pushTokenStorageReady ? 'ready' : 'pending'} · realtime ${input.realtimeNotificationsReady ? 'ready' : 'pending'}.`,
      ready: schemaReady,
      started: input.notificationTableReady || input.pushTokenStorageReady,
      nextStep: 'Apply notification migrations, store push tokens per device, and subscribe to member_notifications.',
    },
    {
      id: 'permission_preferences',
      title: 'Permission and member preferences',
      body: preferenceReady
        ? 'Members can control profile-view alerts, notification preferences and quiet-hour behavior.'
        : 'Push permissions need member-controlled settings, profile-view threshold and quiet-hour controls.',
      ready: preferenceReady,
      started: input.memberPreferencesReady || input.profileViewThresholdReady,
      nextStep: 'Add notification settings for profile views, Sparks, matches, dates, safety and support updates.',
    },
    {
      id: 'event_triggers',
      title: 'Romantic and retention triggers',
      body: `${eventCoverage}% event coverage for profile views, matches, Sparks, dates, safety and support.`,
      ready: eventTriggersReady,
      started: eventCoverage > 0,
      nextStep: 'Create server triggers for mutual match, Spark received, date reminders and profile-view threshold alerts.',
    },
    {
      id: 'push_provider',
      title: 'Push delivery provider',
      body: pushProviderReady
        ? 'Expo/FCM/APNs-style push delivery is configured with server-side secrets.'
        : 'Production push needs Expo Notifications or Firebase/APNs credentials stored only on the server.',
      ready: pushProviderReady,
      started: input.pushProviderConfigured,
      nextStep: 'Configure Expo push or FCM/APNs, move credentials to server secrets, and send only from backend jobs.',
    },
    {
      id: 'deep_links',
      title: 'Deep links and routing',
      body: deepLinksReady
        ? 'Notification taps can route to match detail, chat, date plan, safety and support screens.'
        : 'Notification taps need safe deep links that respect block, privacy and auth state before opening content.',
      ready: deepLinksReady,
      started: input.deepLinkRoutesReady,
      nextStep: 'Map every notification type to an authenticated route with block/privacy checks before rendering.',
    },
    {
      id: 'rate_limits',
      title: 'Quiet hours and anti-spam limits',
      body: rateLimitsReady
        ? 'Rate limits and quiet hours prevent spammy romantic notifications.'
        : 'Sparks, profile views and support updates need rate limits so notifications feel premium, not noisy.',
      ready: rateLimitsReady,
      started: input.rateLimitsReady || input.quietHoursReady,
      nextStep: 'Throttle repeated profile-view/Spark notifications and respect quiet hours, mutes and block graph.',
    },
    {
      id: 'safety_support_alerts',
      title: 'Safety and support alerts',
      body: safetySupportReady
        ? 'Safety, report, support and date check-in alerts are represented.'
        : 'Safety alerts, check-in reminders and support updates need reliable transactional delivery.',
      ready: safetySupportReady,
      started: input.safetyAlertsReady || input.supportAlertsReady,
      nextStep: 'Prioritize safety/support notifications with audit logs and fallback in-app notification center.',
    },
    {
      id: 'production_qa',
      title: 'Physical-device notification QA',
      body: productionQaReady
        ? 'Production push has been tested on real iOS and Android devices.'
        : 'Store launch needs physical-device push tests for permission prompts, app resume, deep links and delivery failures.',
      ready: productionQaReady,
      started: input.physicalDeviceTested,
      nextStep: 'Run iOS/Android device tests for foreground, background, killed app, denied permission and expired token cases.',
    },
  ];

  const blockers = gates.filter((gate) => !gate.ready);
  const readyCount = gates.length - blockers.length;
  const setupBlockerIds: NotificationGateId[] = ['schema_tokens', 'permission_preferences', 'event_triggers', 'deep_links', 'rate_limits', 'safety_support_alerts'];
  const hasSetupBlocker = blockers.some((gate) => setupBlockerIds.includes(gate.id));

  return {
    status: blockers.length === 0 ? 'Ready for notification launch' : hasSetupBlocker ? 'Notification setup needed' : 'Final push provider pending',
    score: Math.round(gates.reduce((sum, gate) => sum + gateScore(gate), 0) / gates.length),
    readyCount,
    total: gates.length,
    eventCoverage,
    blockerCount: blockers.length,
    blockers,
    gates,
    nextBestStep: blockers[0]?.nextStep ?? 'Run notification smoke tests with real devices, push provider, deep links and quiet-hour settings.',
  };
}
