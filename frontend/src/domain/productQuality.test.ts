import { describe, expect, it } from 'vitest';
import { appScreens, buildProductQualitySnapshot, criticalFlows, findMissingFlowScreens, responsiveProfiles } from './productQuality';

describe('product quality readiness', () => {
  it('keeps every critical flow mapped to existing screens', () => {
    expect(findMissingFlowScreens(appScreens, criticalFlows)).toEqual([]);
  });

  it('returns a high preview score while backend is intentionally deferred', () => {
    const snapshot = buildProductQualitySnapshot({
      hasBottomNavScreens: ['home', 'discovery', 'coach', 'executive', 'likes', 'chat', 'profile'],
      hasSafetyActions: true,
      hasSupportFlow: true,
      hasPricingFlow: true,
      hasResponsiveShell: true,
      hasBackendConnected: false,
    });

    expect(snapshot.blockers).toEqual([]);
    expect(snapshot.score).toBe(88);
    expect(snapshot.important.map((item) => item.id)).toEqual(['backend']);
  });

  it('detects missing release-critical screens as blockers', () => {
    const screensWithoutChat = appScreens.filter((screen) => screen !== 'chat');
    const snapshot = buildProductQualitySnapshot({
      availableScreens: screensWithoutChat,
      hasBottomNavScreens: ['home', 'discovery', 'coach', 'executive', 'likes', 'profile'],
      hasSafetyActions: true,
      hasSupportFlow: true,
      hasPricingFlow: true,
      hasResponsiveShell: true,
      hasBackendConnected: false,
    });

    expect(snapshot.blockers.some((item) => item.id === 'navigation')).toBe(true);
    expect(snapshot.blockers.some((item) => item.id === 'critical_flows')).toBe(true);
  });

  it('requires phone, tablet and desktop preview support', () => {
    expect(responsiveProfiles.map((profile) => profile.id)).toEqual(['phone', 'tablet', 'desktop']);
    expect(responsiveProfiles.every((profile) => profile.mustSupport)).toBe(true);
  });
});
