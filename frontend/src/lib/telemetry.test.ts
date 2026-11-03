import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureAnalyticsConsent, track } from './telemetry';

afterEach(() => configureAnalyticsConsent(false));

describe('analytics consent boundary', () => {
  it('does not emit analytics before explicit consent', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    configureAnalyticsConsent(false);
    expect(track('discovery_signal', { type: 'view' })).toBe(false);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('allows typed privacy-safe events after consent', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    configureAnalyticsConsent(true);
    expect(track('discovery_signal', { type: 'interested' })).toBe(true);
    log.mockRestore();
  });
});
