// Shared, module-level hand-off between the active call screen and the
// app-wide back-button guard (in MilaanApp.tsx).
//
// Earlier this was two separate browser-history entries pushed by two
// separate popstate listeners: one in CallModalReal (for the call) and one
// in MilaanApp (for screen navigation), stacked on top of each other.
// That worked for a single, isolated back press, but a real device's
// hardware/gesture back can pop more than one history entry in one user
// gesture (seen on Android Chrome with certain OS/gesture-nav setups) --
// when that happened, the second pop landed on the app-wide listener with
// no awareness a call was ever involved, and it navigated screens, tearing
// the call down along with the screen it was shown on.
//
// Now there is exactly one pushed history entry and one listener (the
// app-wide one). Before it does anything else with a back press, it checks
// here, synchronously, whether a full-screen call wants first claim on
// it -- if so, it minimizes the call and re-seeds its own entry instead of
// navigating. A rapid second pop in the same gesture then finds the call
// already minimized (this registry already cleared) and falls through to
// ordinary screen navigation, rather than ending the call.
let activeMinimizer: (() => void) | null = null;

export function setActiveCallMinimizer(fn: (() => void) | null) {
  activeMinimizer = fn;
}

// Returns true if a call was active and got minimized (the back press was
// consumed); false if there was nothing to do here.
export function minimizeActiveCallIfAny(): boolean {
  if (!activeMinimizer) return false;
  const fn = activeMinimizer;
  // Clear before calling: if a second popstate fires synchronously (part of
  // the same multi-pop gesture) before this one's state update lands, it
  // must see "already handled" rather than minimizing/consuming twice.
  activeMinimizer = null;
  fn();
  return true;
}
