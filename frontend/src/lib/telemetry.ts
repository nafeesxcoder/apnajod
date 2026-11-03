import { configureLaunchAnalyticsConsent, enqueueLaunchAnalytics, type LaunchAnalyticsRuntime } from '../app/adapters/previewAnalytics';

type AnalyticsEvent =
  | { name: 'discovery_signal'; properties: { type: 'view' | 'interested' | 'skip' } }
  | { name: 'relationship_path_opened'; properties: { stage: string } }
  | { name: 'date_plan_status_changed'; properties: { from_status: string; to_status: string } }
  | { name: 'private_reflection_saved'; properties: { choice: 'continue' | 'pause' | 'close' } }
  | { name: 'relationship_learning_consent_changed'; properties: { enabled: boolean } }
  | { name: 'date_reminder_changed'; properties: { enabled: boolean } }
  | { name: 'screen_viewed'; properties: { screen_key: string } }
  | { name: 'onboarding_started'; properties: { screen_key: string } }
  | { name: 'membership_viewed'; properties: { screen_key: 'pricing' } }
  | { name: 'checkout_started'; properties: { item_key: string; platform: string } }
  | { name: 'checkout_store_opened'; properties: { item_key: string; platform: string } }
  | { name: 'checkout_verification_started'; properties: { item_key: string; platform: string } }
  | { name: 'checkout_completed'; properties: { item_key: string; platform: string } }
  | { name: 'checkout_failed'; properties: { error_code: string; platform: string } }
  | { name: 'restore_started'; properties: { platform: string } }
  | { name: 'restore_completed'; properties: { count_bucket: string; platform: string } }
  | { name: 'restore_failed'; properties: { error_code: string; platform: string } };

let analyticsConsentEnabled = false;

export function configureAnalyticsConsent(enabled: boolean, runtime?: LaunchAnalyticsRuntime) {
  analyticsConsentEnabled = enabled;
  configureLaunchAnalyticsConsent(enabled, runtime);
}

/**
 * Privacy-safe analytics boundary. Never pass names, contact details, message
 * contents, precise locations, photos, or profile IDs here. Connect this to a
 * consent-aware production analytics provider during launch configuration.
 */
export function track<T extends AnalyticsEvent['name']>(
  name: T,
  properties: Extract<AnalyticsEvent, { name: T }>['properties'],
) {
  if (!analyticsConsentEnabled) return false;
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.info(`[analytics] ${name}`, properties);
  return enqueueLaunchAnalytics(name, properties);
}

/** Connect this adapter to Sentry (or equivalent) after production DSN setup. */
export function captureException(error: unknown, context?: string) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.error(`[crash]${context ? ` ${context}` : ''}`, error);
}
