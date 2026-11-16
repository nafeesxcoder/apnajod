import InCallManager from "react-native-incall-manager";

/**
 * The sound the caller hears while the other phone rings, in the phone app.
 *
 * The web version builds the tone with the Web Audio API, which the phone
 * app does not have, so on Android and iPhone the caller heard silence.
 * Here the phone's own call ringback tone plays through InCallManager,
 * the same library that already routes call audio.
 */
type Ringback = { stop: () => void };

export function startRingback(): Ringback {
  try {
    InCallManager.startRingback("_DTMF_");
  } catch {
    return { stop: () => undefined };
  }
  let stopped = false;
  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try {
        InCallManager.stopRingback();
      } catch {
        // The call screen is closing anyway.
      }
    },
  };
}
