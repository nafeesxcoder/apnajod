import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cleanUtr, upiLink, utrValid } from './upiLink';

/**
 * Paying by UPI to our own ID while Razorpay waits on KYC. The member
 * sends the UTR and an admin approves it; Razorpay stays hidden until its
 * account is live.
 */
describe('UPI payments', () => {
  it('opens a UPI app with the ID, the exact amount and a note', () => {
    expect(
      upiLink({ upiId: 'nafeesahmadno1@ybl', payeeName: 'Nafees Ahmad', amountPaise: 19900, note: 'Apnajoda Plus' }),
    ).toBe('upi://pay?pa=nafeesahmadno1%40ybl&pn=Nafees%20Ahmad&am=199.00&cu=INR&tn=Apnajoda%20Plus');
  });

  it('takes a 12 digit UTR, whatever was pasted around it', () => {
    expect(cleanUtr('UTR: 4321 5678 9012')).toBe('432156789012');
    expect(cleanUtr('4321567890123456')).toBe('432156789012');
    expect(utrValid('432156789012')).toBe(true);
    expect(utrValid('43215678')).toBe(false);
  });

  it('shows the QR and sends the UTR for approval on the Premium screen', () => {
    const screen = readFileSync(join(__dirname, 'screens/PremiumScreen.tsx'), 'utf8');
    // One Pay button under the plan; the QR opens from it, not inline.
    expect(screen).toContain('<UpiPaySheet');
    expect(screen).toContain('setUpiSheetOpen(true)');
    expect(screen).not.toContain('<UpiPay\n');
    expect(screen).toContain('<UpiPayments');
    // Razorpay test keys never reach members.
    expect(screen).toContain('!!payOptions?.razorpay');
    const pay = readFileSync(join(__dirname, 'UpiPay.tsx'), 'utf8');
    expect(pay).toContain('assets/upi-qr.jpg');
    expect(pay).toContain('billingApi.submitUpi');
    // UPI apps decline a pay link to a personal UPI ID, so: QR (with a
    // download) or the UPI ID to copy - no "Open UPI app".
    expect(pay).not.toContain('Open UPI app');
    expect(pay).toContain('accessibilityLabel="Download QR"');
    expect(pay).toContain('accessibilityLabel="Copy UPI ID"');
    expect(pay).toContain('title="Scan the QR"');
    expect(pay).toContain('title="Pay to the UPI ID"');
  });

  it('gives the admin a UPI Payments tab to approve or reject', () => {
    const admin = readFileSync(join(__dirname, '../admin/screens/AdminDashboardScreen.tsx'), 'utf8');
    expect(admin).toContain('{ key: "payments", label: "UPI Payments"');
    expect(admin).toContain('adminApi.approvePayment');
    expect(admin).toContain('title="UPI to verify"');
  });
});
