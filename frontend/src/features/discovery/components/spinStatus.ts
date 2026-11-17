/**
 * The daily spin on Home: ready now, or how long until the next one.
 * `spinReadyAt` comes from the server (the wallet); `now` is Date.now().
 */
export function spinStatus(spinReadyAt: string, now: number): { ready: boolean; label: string } {
  const readyAt = new Date(spinReadyAt).getTime();
  if (!Number.isFinite(readyAt) || readyAt <= now) return { ready: true, label: "Spin ready" };
  const diff = readyAt - now;
  if (diff < 60_000) return { ready: false, label: "Next spin in under a minute" };
  const minutes = Math.ceil(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return { ready: false, label: hours > 0 ? `Next spin in ${hours}h ${rest}m` : `Next spin in ${rest}m` };
}
