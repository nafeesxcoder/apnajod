export const launchAnalyticsEvents = [
  'app_session_started','screen_viewed','onboarding_started','membership_viewed','checkout_started','checkout_store_opened',
  'checkout_verification_started','checkout_completed','checkout_failed','restore_started','restore_completed','restore_failed',
  'discovery_signal','relationship_path_opened','date_plan_status_changed',
  'private_reflection_saved','relationship_learning_consent_changed','date_reminder_changed',
] as const;
export type LaunchAnalyticsEventName = (typeof launchAnalyticsEvents)[number];
export type LaunchAnalyticsRuntime = { platform?: 'ios'|'android'|'web'; appVersion?: string; buildVariant?: 'development'|'pilot'|'production'|'preview' };
type SafeValue = string | number | boolean;
const allowedKeys = new Set(['screen_key','action_key','item_key','status_key','source_key','type','stage','from_status','to_status','choice','enabled','demo','count_bucket','value_bucket','platform','app_version','build_variant','network_state','duration_bucket','error_code']);
const aliases: Record<string,string> = { item: 'item_key', coins: 'value_bucket' };
const forbiddenFragments = ['name','email','phone','message','photo','latitude','longitude','address','profile','match','otp','token','transaction'];
let consent = false;

const safeSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80) || 'unknown';
export function sanitizeLaunchAnalyticsProperties(properties: Record<string,unknown>) {
  const result: Record<string,SafeValue> = {};
  for (const [rawKey, rawValue] of Object.entries(properties)) {
    const key = aliases[rawKey] ?? rawKey;
    if (!allowedKeys.has(key) || forbiddenFragments.some(fragment => key.toLowerCase().includes(fragment))) continue;
    if (typeof rawValue === 'string') result[key] = ['item_key','screen_key','action_key','status_key','source_key','error_code','type','stage','from_status','to_status','choice','platform','build_variant','network_state','duration_bucket'].includes(key) ? safeSlug(rawValue) : rawValue.slice(0,80);
    else if (typeof rawValue === 'number') result[key] = key === 'value_bucket' ? String(Math.max(0,Math.round(rawValue))) : Number.isFinite(rawValue) ? rawValue : 0;
    else if (typeof rawValue === 'boolean') result[key] = rawValue;
  }
  return result;
}
export function configureLaunchAnalyticsConsent(enabled: boolean, _runtime: LaunchAnalyticsRuntime = {}) { consent = enabled; }
export function enqueueLaunchAnalytics(_name: LaunchAnalyticsEventName, properties: Record<string,unknown>) {
  if (!consent) return false;
  sanitizeLaunchAnalyticsProperties(properties);
  return true;
}
