import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { fakePhotos, mockApi } from "./mockApi";

/**
 * Sign-up end to end: number, username, password -> SMS code -> the short
 * profile with a photo -> Home. The picked photo must reach the server as an
 * uploaded https address; saving the browser's own blob: link left new
 * members with a picture nobody else could see (Nov 2026).
 */
test("a new member signs up, adds a photo, and the uploaded photo is what gets saved", async ({ page }) => {
  test.setTimeout(120_000); // five screens, a photo crop and an upload
  const user = { id: "u9", phone: "+919876543210", email: null, username: "riya_07", fullName: null, avatarUrl: null };
  const profile: Record<string, any> = {};
  let photos: string[] = [];
  const calls = await mockApi(page, {
    "GET /auth/username/available": { ok: true, available: true, reason: "" },
    "POST /auth/register": { ok: true, phone: user.phone, username: user.username, expiresInSeconds: 300 },
    "POST /auth/register/verify": (body: any, route: any) =>
      body.code === "123456"
        ? { ok: true, accessToken: "t1", refreshToken: "r1", user }
        : route.fulfill({ status: 400, json: { error: "That code is not right." } }).then(() => undefined),
    "GET /auth/me": { ok: true, user },
    "GET /profile/me": () => ({ ok: true, profile: Object.keys(profile).length ? profile : null, photos, vibes: [] }),
    "POST /profile/upload-photo": { ok: true, url: "http://api.test/api/uploads/photos/riya.png" },
    "PUT /profile/profile": (body: any) => {
      Object.assign(profile, { first_name: body.firstName, age: Number(body.age), gender: body.gender });
      return { ok: true };
    },
    "PUT /profile/photos": (body: any) => {
      photos = body.photos;
      return { ok: true };
    },
    "POST /profile/complete": () => {
      profile.onboarding_complete = 1;
      return { ok: true };
    },
    "GET /profile/discover": { ok: true, matches: [] },
  });
  await fakePhotos(page);

  await page.goto("/");
  await page.getByText("Create account").click();
  await page.getByLabel("Mobile number").fill("9876543210");
  await page.getByLabel("Username").fill("riya_07");
  await page.getByLabel("Password", { exact: true }).fill("secret12");
  await page.getByLabel("Send me a code").click();

  await page.getByLabel("6-digit code").fill("123456");
  await page.getByLabel("Create my account").click();

  // The short profile, with a photo picked and its circle chosen.
  await expect(page.getByLabel("First name")).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page.getByLabel("Add a photo").click();
  await (await chooser).setFiles(join(__dirname, "..", "assets", "apnajoda-logo.png"));
  await page.getByLabel("Use photo").last().click();

  await page.getByLabel("First name").fill("Riya");
  await page.getByLabel("Age").fill("26");
  await page.getByText("Woman", { exact: true }).click();
  await page.getByLabel("Start meeting people").click();

  await expect(page.getByText("Riya", { exact: true }).first()).toBeVisible();
  expect(calls.some((c) => c.method === "POST" && c.path === "/profile/upload-photo")).toBe(true);
  expect(photos).toEqual(["http://api.test/api/uploads/photos/riya.png"]);
  expect(profile.first_name).toBe("Riya");
  expect(profile.onboarding_complete).toBe(1);
});
