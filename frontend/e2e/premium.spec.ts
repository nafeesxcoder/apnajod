import { expect, test } from "@playwright/test";
import { fakeMember, fakePhotos, mockApi, signedIn } from "./mockApi";

/**
 * Premium on the website: no payment here, it sends members to the Android
 * app on Google Play; a pass code from the admin starts a free pass.
 */
const PLANS = [
  { code: "plus_monthly", title: "Plus", kind: "subscription", amount_paise: 19900, currency: "INR", play_product_id: "plus_monthly" },
  { code: "pro_monthly", title: "Pro", kind: "subscription", amount_paise: 49900, currency: "INR", play_product_id: "pro_monthly" },
];
const FREE = { premium: false, premiumUntil: null, pro: false, likes: { limit: 20, used: 0, remaining: 20 }, boost: { balance: 0, active: null } };
const PLUS = { ...FREE, premium: true, premiumUntil: "2026-12-31T00:00:00Z", likes: { limit: null, used: 0, remaining: null } };

test("the website sends members to Google Play and takes a pass code", async ({ page }) => {
  await signedIn(page);
  await fakePhotos(page);
  const member = fakeMember();
  const calls = await mockApi(page, {
    ...member.handlers,
    "GET /billing/plans": { ok: true, plans: PLANS },
    "GET /billing/me": { ok: true, billing: FREE },
    "POST /billing/redeem-code": (body: any, route: any) =>
      body.code === "DIWALIFREE"
        ? { ok: true, code: "DIWALIFREE", pass: { planLabel: "Plus", expiresAt: "2026-12-31T00:00:00Z" }, billing: PLUS }
        : route.fulfill({ status: 404, json: { error: "That code is not right." } }).then(() => undefined),
  });

  await page.goto("/");
  await page.getByText("Profile", { exact: true }).last().click();
  await page.getByLabel("See Premium").click();

  await expect(page.getByText("Get it on Google Play")).toBeVisible();
  await expect(page.getByText(/UTR|UPI ID|Scan the QR/)).toHaveCount(0);

  await page.getByLabel("Have a pass code?").click();
  await page.getByLabel("Pass code", { exact: true }).fill("diwali free");
  await page.getByLabel("Use pass code").click();

  await expect(page.getByText(/Plus is on, free till/)).toBeVisible();
  expect(calls.find((c) => c.path === "/billing/redeem-code")?.body).toEqual({ code: "DIWALIFREE" });
});
