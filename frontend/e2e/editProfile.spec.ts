import { expect, test } from "@playwright/test";
import { fakeMember, fakePhotos, mockApi, signedIn } from "./mockApi";

/**
 * Edit profile: nothing changes until Save, and Save leaves the editor for
 * Profile - which back must not undo. Both were real bugs (Nov 2026).
 */
test.beforeEach(async ({ page }) => {
  await signedIn(page);
  await fakePhotos(page);
});

async function openEditor(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByText("Profile", { exact: true }).last().click();
  await expect(page.getByText("Asha, 27")).toBeVisible();
  await page.getByText("Edit profile", { exact: true }).click();
  await expect(page.getByPlaceholder("Enter your first name")).toBeVisible();
}

test("leaving without Save keeps the old profile and saves nothing", async ({ page }) => {
  const member = fakeMember();
  const calls = await mockApi(page, member.handlers);
  await openEditor(page);

  await page.getByPlaceholder("Enter your first name").fill("Riya");
  await page.getByPlaceholder("e.g. Mumbai, MH").fill("Pune");
  await page.goBack();

  await expect(page.getByText("Asha, 27")).toBeVisible();
  await expect(page.getByText("Riya")).toHaveCount(0);
  expect(calls.filter((c) => c.method === "PUT")).toEqual([]);
  expect(member.state.profile.first_name).toBe("Asha");
});

test("Save stores the change, opens Profile, and back does not reopen the editor", async ({ page }) => {
  const member = fakeMember();
  const calls = await mockApi(page, member.handlers);
  await openEditor(page);

  await page.getByPlaceholder("Enter your first name").fill("Riya");
  await page.getByText("Save Profile →").click();

  await expect(page.getByText("Riya, 27")).toBeVisible();
  const put = calls.find((c) => c.method === "PUT" && c.path === "/profile/profile");
  expect(put?.body.firstName).toBe("Riya");
  expect(member.state.profile.first_name).toBe("Riya");

  // The "Profile updated" popup closes by itself; the editor must not come back.
  await page.waitForTimeout(2500);
  await expect(page.getByPlaceholder("Enter your first name")).toHaveCount(0);
  await page.goBack();
  await expect(page.getByPlaceholder("Enter your first name")).toHaveCount(0);
});
