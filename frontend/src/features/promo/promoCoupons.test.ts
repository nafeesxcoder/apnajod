import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { countdown, PROMO_STYLES, promoStyle } from './styles';
import { setPendingCoupon, takePendingCoupon } from '../premium/couponStore';
import { FESTIVAL_THEMES } from '../festival/themes';

const read = (path: string) => readFileSync(join(__dirname, path), 'utf8');

describe('offer popup', () => {
  it('counts down to the end, and stops at it', () => {
    const now = Date.parse('2026-11-14T10:00:00Z');
    expect(countdown('2026-11-14T12:30:05Z', now)).toBe('02:30:05');
    expect(countdown('2026-11-16T12:30:05Z', now)).toBe('2d 02:30:05');
    expect(countdown('2026-11-14T09:00:00Z', now)).toBeNull();
    expect(countdown(null, now)).toBeNull();
  });

  it('has the looks the server allows, and falls back to classic', () => {
    expect(Object.keys(PROMO_STYLES)).toEqual(['classic', 'gold', 'midnight', 'sunset', 'love', 'diwali', 'eid', 'holi']);
    expect(promoStyle('nope').key).toBe('classic');
  });

  it('shows on every app open until closed, never over Premium or the admin, and hands its coupon to Premium', () => {
    const host = read('PromoHost.tsx');
    expect(host).toContain('setPendingCoupon(promo.couponCode)');
    expect(host).toContain('if (hidden || !promo || promo.id === closedId) return null;');
    const app = read('../../app/MilaanApp.tsx');
    expect(app).toContain('hidden={screen === "adminDashboard" || screen === "premium"}');
    expect(app).toContain('socket.on("app:promo", onPromo)');
  });
});

describe('coupons', () => {
  it('passes a coupon from the popup to Premium once', () => {
    setPendingCoupon(' diwali50 ');
    expect(takePendingCoupon()).toBe('DIWALI50');
    expect(takePendingCoupon()).toBeNull();
  });

  it('asks the server for the price and sends the coupon with the payment', () => {
    const premium = read('../premium/screens/PremiumScreen.tsx');
    expect(premium).toContain('<CouponBox');
    expect(premium).toContain('billingApi.createOrder(accessToken, selectedCode, coupon?.code)');
    expect(premium).toContain('couponCode={coupon?.code ?? null}');
    const box = read('../premium/CouponBox.tsx');
    expect(box).toContain('billingApi.checkCoupon(accessToken, plan.code, value)');
    expect(read('../premium/UpiPay.tsx')).toContain('billingApi.submitUpi(accessToken, plan.code, utr, couponCode)');
  });

  it('gives the admin Coupons and Offer Popup tabs', () => {
    const admin = read('../admin/screens/AdminDashboardScreen.tsx');
    expect(admin).toContain('{ key: "coupons", label: "Coupons"');
    expect(admin).toContain('{ key: "promo", label: "Offer Popup"');
    expect(admin).toContain('adminApi.createCoupon');
    expect(admin).toContain('adminApi.publishPromo');
  });
});

describe('livelier festival themes', () => {
  it('every festival has a moving scene, a first-open show and spark colours', () => {
    for (const theme of Object.values(FESTIVAL_THEMES)) {
      expect(['diyas', 'lanterns', 'colours', 'snow', 'fireworks', 'hearts', 'garland']).toContain(theme.scene);
      expect(['fall', 'rise', 'fireworks']).toContain(theme.show);
      expect(theme.sparks.length).toBeGreaterThan(1);
    }
    expect(FESTIVAL_THEMES.diwali!.show).toBe('fireworks');
    expect(FESTIVAL_THEMES.valentines!.show).toBe('rise');
  });

  it('bursts where tapped and stays calm for people who turned motion down', () => {
    const banner = read('../festival/FestivalBanner.tsx');
    expect(banner).toContain('<FestivalScene theme={theme} box={box} />');
    expect(banner).toContain('<TapBurst');
    expect(banner).toContain('isReduceMotionEnabled');
  });
});
