import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { rupees } from '../../api/billingApi';

/**
 * The Premium screen.
 *
 * Checkout is live through Razorpay. Prices come from the server so a
 * change is an UPDATE, not a deploy, and one flag in billingApi closes
 * payments again if ever needed - taking the Buy button with it, so nobody
 * is shown a button that cannot work.
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

  it('shows the Razorpay button only while checkout is open and the account is live', () => {
    // The flag still closes Razorpay; the server also has to say its keys
    // are live ones, so test keys never reach members.
    expect(screen).toContain('const razorpayOpen = billingApi.checkoutAvailable && !!payOptions?.razorpay;');
    expect(screen).toMatch(
      /\{razorpayOpen && \(\s*<PressScale[\s\S]{0,200}?onPress=\{\(\) => void handleBuy\(\)\}/,
    );
  });

  it('says plainly that everything is free while payments are closed', () => {
    // Closed means no UPI and no Razorpay.
    expect(screen).toContain('!upiOpen && !razorpayOpen');
    expect(screen).toMatch(/free for\s*\n?\s*everyone/);
  });

  it('has one flag to open or close payments, in one place', () => {
    expect(api).toMatch(/checkoutAvailable: (true|false),/);
    expect(api.match(/checkoutAvailable:/g)).toHaveLength(1);
  });

  it('shows the member where they stand', () => {
    expect(screen).toContain('billingApi.me(accessToken)');
    expect(screen).toContain('You have {currentPlanName}');
  });
});
