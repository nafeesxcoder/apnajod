import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { rupees } from '../../api/billingApi';

/**
 * The Premium screen.
 *
 * Android buys Premium through Google Play; the website only points people
 * to the Play Store app. Prices come from the server so a change is an
 * UPDATE, not a deploy.
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
    // A price hardcoded here would quietly disagree with billing_plans.
    // The free plan's ₹0 is the one fixed price there is.
    expect(screen).toContain('billingApi.plans()');
    expect(screen).toContain('rupees(plan.amount_paise)');
    expect(screen).not.toMatch(/₹\s?[1-9]/);
  });

  it('never shows a Razorpay button or calls Razorpay', () => {
    // Razorpay refused this dating business and no key will be issued, so
    // neither the screen nor the API may mention it again.
    expect(screen.toLowerCase()).not.toContain('razorpay');
    expect(api.toLowerCase()).not.toContain('razorpay');
    expect(api).not.toContain('createOrder');
    expect(api).not.toContain('verifyPayment');
  });

  it('sends Android buyers to Google Play and web visitors to the Play Store', () => {
    expect(screen).toContain('accessibilityLabel={buying ? "Opening Google Play" : "Buy with Google Play"}');
    expect(screen).toContain('const PLAY_STORE_URL');
    expect(screen).toContain('Get it on Google Play');
  });

  it('says plainly that everything is free while payments are closed', () => {
    // Closed on the web means no UPI and no Play button there.
    expect(screen).toContain('!upiOpen && Platform.OS === "web"');
    expect(screen).toMatch(/free for\s*\n?\s*everyone/);
  });

  it('shows the member where they stand', () => {
    expect(screen).toContain('billingApi.me(accessToken)');
    expect(screen).toContain('You have {currentPlanName}');
  });
});
