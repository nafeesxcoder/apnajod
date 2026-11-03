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
    development: 'com.milaan.app.dev',
    pilot: 'com.milaan.app.pilot',
    production: 'com.milaan.app',
  };
  const names: Record<AppVariant, string> = {
    development: 'Milaan Dev',
    pilot: 'Milaan Pilot',
    production: 'Milaan',
  };
  const schemes: Record<AppVariant, string> = {
    development: 'milaan-dev',
    pilot: 'milaan-pilot',
    production: 'milaan',
  };
  const plugins = [
    ...(config.plugins ?? []),
    ['expo-dev-client', {addGeneratedScheme: variant === 'development'}],
  ] as ExpoConfig['plugins'];
  const eas = easProjectId ? {projectId: easProjectId} : undefined;

  return {
    ...config,
    name: names[variant],
    slug: 'milaan',
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
