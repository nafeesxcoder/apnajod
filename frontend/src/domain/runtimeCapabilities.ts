export type RuntimeCapabilityMode = 'live' | 'demo' | 'blocked';

export type RuntimeCapabilitiesInput = {
  appEnvironment: 'development' | 'staging' | 'production' | string;
  requiresRealBackend: boolean;
  paymentsConfigured: boolean;
  storeBillingConnected: boolean;
  verifiedVouchRewardsConnected: boolean;
};

export type RuntimeCapabilities = {
  strictRuntime: boolean;
  dateReservations: RuntimeCapabilityMode;
  vouchRewards: RuntimeCapabilityMode;
};

function mode(configured: boolean, strictRuntime: boolean): RuntimeCapabilityMode {
  if (configured) return 'live';
  return strictRuntime ? 'blocked' : 'demo';
}

export function buildRuntimeCapabilities(input: RuntimeCapabilitiesInput): RuntimeCapabilities {
  const strictRuntime = input.appEnvironment === 'production' || input.requiresRealBackend;
  return {
    strictRuntime,
    dateReservations: mode(input.paymentsConfigured, strictRuntime),
    vouchRewards: mode(input.verifiedVouchRewardsConnected, strictRuntime),
  };
}
