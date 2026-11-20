import { expect, test } from "@playwright/test";
import { fakeMember, fakePhotos, mockApi } from "./mockApi";

/** Log in with a username and password: a wrong one stays put with a clear message, the right one opens Home. */
test("log in: wrong password is refused, the right one opens Home", async ({ page }) => {
  const member = fakeMember();
  const calls = await mockApi(page, {
    ...member.handlers,
    "POST /auth/login": (body: any, route: any) =>
      body.password === "secret12"
        ? { ok: true, accessToken: "t1", refreshToken: "r1", user: { id: "u1", phone: "+919999999999", email: null, username: "asha", fullName: null, avatarUrl: null } }
        : route.fulfill({ status: 401, json: { error: "Wrong username or password." } }).then(() => undefined),
  });
  await fakePhotos(page);

  await page.goto("/");
  await page.getByText("I already have an account").click();
  await page.getByLabel("Username or mobile number").fill("asha");
  await page.getByLabel("Password", { exact: true }).fill("wrong-one");
  await page.getByLabel("Log in", { exact: true }).click();
  await expect(page.getByText("Wrong username or password.")).toBeVisible();
  await expect(page.getByLabel("Username or mobile number")).toBeVisible();

  await page.getByLabel("Password", { exact: true }).fill("secret12");
  await page.getByLabel("Log in", { exact: true }).click();
  await expect(page.getByText(/^Good (morning|afternoon|evening|night)/).first()).toBeVisible();
  await expect(page.getByText("Asha").first()).toBeVisible();
  expect(calls.filter((c) => c.path === "/auth/login").map((c) => c.body.identifier)).toEqual(["asha", "asha"]);
  expect(await page.evaluate(() => localStorage.getItem("milaan_access_token"))).toBe("t1");
});
