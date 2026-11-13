import { existsSync } from 'fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'pilot' | 'production';

function resolveVariant(value?: string): AppVariant {
  if (value === 'development' || value === 'pilot' || value === 'production') return value;
  return 'production';
}

export default ({config}: ConfigContext): ExpoConfig => {
  const variant = resolveVariant(process.env.APP_VARIANT);
  const easProjectId = process.env.EAS_PROJECT_ID?.trim();
  const identifiers: Record<AppVariant, string> = {
    development: 'com.apnajoda.app.dev',
    pilot: 'com.apnajoda.app.pilot',
    production: 'com.apnajoda.app',
  };
  const names: Record<AppVariant, string> = {
    development: 'Apnajoda Dev',
    pilot: 'Apnajoda Pilot',
    production: 'Apnajoda',
  };
  const schemes: Record<AppVariant, string> = {
    development: 'apnajoda-dev',
    pilot: 'apnajoda-pilot',
    production: 'apnajoda',
  };
  const plugins = [
    ...(config.plugins ?? []),
    ['expo-dev-client', {addGeneratedScheme: variant === 'development'}],
  ] as ExpoConfig['plugins'];
  const eas = easProjectId ? {projectId: easProjectId} : undefined;
  // Firebase's file for Android notifications. On EAS it comes from the file
  // variable GOOGLE_SERVICES_JSON (it is kept out of git); a local copy also works.
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON || (existsSync('./google-services.json') ? './google-services.json' : undefined);

  return {
    ...config,
    name: names[variant],
    slug: 'apnajoda',
    scheme: schemes[variant],
    orientation: 'default',
    plugins,
    extra: {...config.extra, ...(eas ? {eas} : {}), buildVariant: variant},
    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: identifiers[variant],
    },
    android: {
      ...config.android,
      package: identifiers[variant],
      ...(googleServicesFile ? {googleServicesFile} : {}),
    },
  };
};
