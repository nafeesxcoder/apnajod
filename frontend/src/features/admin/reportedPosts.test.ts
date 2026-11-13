import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(__dirname, "..", "..", path), "utf8").replace(/\r\n/g, "\n");
const admin = read("features/admin/screens/AdminDashboardScreen.tsx");
const sheets = read("features/posts/PostSheets.tsx");
const adminApi = read("api/adminApi.ts");

describe("reported posts in the admin panel", () => {
  it("shows each reported post's photo, caption and reasons", () => {
    expect(admin).toContain("r.reported_posts.map((post: any)");
    expect(admin).toContain('accessibilityLabel="Reported post photo"');
  });

  it("removes a post only on a second tap, or keeps it", () => {
    expect(admin).toContain('armed ? "Tap again to remove" : "Remove post"');
    expect(admin).toContain('label="Keep post"');
    expect(adminApi).toContain("/admin/posts/${postId}/remove");
    expect(adminApi).toContain("/admin/posts/${postId}/keep");
  });
});

describe("reporting a post from the app", () => {
  it("sends the post id, and treats a refusal as a failure", () => {
    expect(sheets).toMatch(/`report-\$\{Date\.now\(\)\}`,\n\s+post\.id,/);
    expect(sheets).toContain("if (!result?.saved) throw new Error");
  });
});
