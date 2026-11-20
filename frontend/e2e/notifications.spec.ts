import { expect, test } from "@playwright/test";
import { fakeMember, fakePhotos, mockApi, signedIn } from "./mockApi";

/**
 * One bell on Home for everything new: Notifications has two tabs, Likes
 * (who liked you) and Activity (likes, comments and mentions on your posts
 * and stories). The heart that used to open Activity separately is gone.
 */
const ravi = { userId: "u3", username: "ravi_k", name: "Ravi", avatarUrl: null };

test("the bell counts likes and activity together, and opens Activity when only that is new", async ({ page }) => {
  await signedIn(page);
  await fakePhotos(page);
  const member = fakeMember();
  const calls = await mockApi(page, {
    ...member.handlers,
    "GET /matches/notifications": { ok: true, unread: 0 },
    "GET /posts/activity/unread": { ok: true, unread: 2 },
    "GET /posts/activity": {
      ok: true,
      unread: 2,
      items: [
        { kind: "like", at: new Date().toISOString(), body: null, post: { id: "p1", mediaUrl: "http://api.test/api/uploads/photos/p1.png" }, story: null, actor: ravi, isNew: true },
        { kind: "comment", at: new Date().toISOString(), body: "Lovely!", post: { id: "p1", mediaUrl: "http://api.test/api/uploads/photos/p1.png" }, story: null, actor: ravi, isNew: true },
      ],
    },
    "POST /posts/activity/seen": { ok: true },
    "GET /matches/likes": { ok: true, likes: [] },
    "POST /matches/notifications/seen": { ok: true },
  });

  await page.goto("/");
  await page.getByLabel("Notifications, 2 new").waitFor();
  // No separate Activity heart; the bell carries the 2 new.
  await expect(page.getByLabel("Notifications, 2 new")).toBeVisible();
  await expect(page.getByLabel(/^Activity/)).toHaveCount(0);

  await page.getByLabel("Notifications, 2 new").click();
  // Opened straight on Activity, since only that had news.
  await expect(page.getByText("commented: Lovely!")).toBeVisible();
  // Seen now: no count left on the tab you are on.
  await expect(page.getByRole("tab", { name: "Activity", exact: true })).toBeVisible();
  expect(calls.some((c) => c.method === "POST" && c.path === "/posts/activity/seen")).toBe(true);

  await page.getByRole("tab", { name: /^Likes/ }).click();
  await expect(page.getByText("commented: Lovely!")).toHaveCount(0);
});
