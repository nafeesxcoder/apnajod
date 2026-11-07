import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { rupees } from '../../api/billingApi';

/**
 * The Premium screen, before there is a way to pay.
 *
 * It exists so the offer and the prices are real and reviewable, but it
 * cannot take money: Razorpay is not connected and Play Billing needs the
 * app listed first. A button that fails when tapped is worse than no
 * button, so there is no button - and one flag turns the whole screen
 * live rather than a rewrite.
 */
const screen = readFileSync(
  'src/features/premium/screens/PremiumScreen.tsx',
  'utf8',
);
const api = readFileSync('src/api/billingApi.ts', 'utf8');

describe('prices', () => {
  it('reads paise as rupees', () => {
    // The server sends paise so that two places cannot round differently.
    expect(rupees(9900)).toBe('₹99');
    expect(rupees(29900)).toBe('₹299');
    expect(rupees(4900)).toBe('₹49');
  });

  it('keeps paise that are not whole rupees', () => {
    expect(rupees(9950)).toBe('₹99.50');
  });
});

describe('the Premium screen', () => {
  it('takes its plans and prices from the server, not from the app', () => {
    // Prices live in billing_plans so changing one is an UPDATE and no
    // deploy. A price hardcoded here would quietly disagree with it.
    expect(screen).toContain('billingApi.plans()');
    expect(screen).toContain('rupees(plan.amount_paise)');
    expect(screen).not.toMatch(/₹\s?\d/);
  });

  it('offers no button while checkout is closed', () => {
    expect(screen).toContain('!billingApi.checkoutAvailable');
    expect(screen).toContain('Opening soon');
  });

  it('says plainly that everything is free in the meantime', () => {
    expect(screen).toMatch(/free for\s*\n?\s*everyone/);
  });

  it('has one flag to turn on, in one place', () => {
    expect(api).toContain('checkoutAvailable: false');
  });

  it('shows the member where they stand', () => {
    expect(screen).toContain('billingApi.me(accessToken)');
    expect(screen).toContain('You have Premium');
  });
});
