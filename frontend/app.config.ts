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
    },
  };
};
