import { describe, expect, it } from 'vitest';
import { previewScreens } from './types';

const completeRouteInventory = [
  'splash','welcome','signup','login','otp','forgotPassword','newPassword','quickProfile',
  'profileSetup','vibes','intent','alignment',
  // The dating product.
  'home','discovery','detail','mutual','icebreaker','likes',
  // The follow graph alongside it.
  'chats','find','requests','person','followers','following','chat',
  'profile','safety','verifyHub',
] as const;

describe('complete route inventory', () => {
  it('keeps every top-level screen available for preview and QA', () => {
    expect(previewScreens).toEqual(completeRouteInventory);
    expect(new Set(previewScreens).size).toBe(completeRouteInventory.length);
  });

  it('covers the whole sign-up path in three screens plus the welcome door', () => {
    const signUpPath = previewScreens.filter((screen) =>
      ['welcome', 'signup', 'otp', 'quickProfile'].includes(screen),
    );
    expect(signUpPath).toEqual(['welcome', 'signup', 'otp', 'quickProfile']);
  });

  it('gives forgetting a password its own two screens', () => {
    expect(previewScreens).toContain('forgotPassword');
    expect(previewScreens).toContain('newPassword');
  });

  it('no longer routes selfie or ID verification through sign-up', () => {
    expect(previewScreens).not.toContain('verify');
    expect(previewScreens).toContain('verifyHub');
  });

  it('keeps the features held back for later out of the launch build', () => {
    // Each of these is one more place a young app looks empty. They are in
    // history and come back when a city has the people to fill them.
    for (const held of [
      'datePlan','events','coach','blueprint','journey','readiness',
      'executive','community','circle','dateSafety','support','admin',
      'explore','modeSelect','pricing','coupleSetup',
    ]) {
      expect(previewScreens).not.toContain(held);
    }
  });
});
