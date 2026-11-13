import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const home = read("../discovery/screens/HomeScreen.tsx");
const modal = read("ActivityModal.tsx");
const sw = read("../../../public/sw.js");
const app = read("../../app/MilaanApp.tsx");

describe("Activity", () => {
  it("is the heart on Home, with a dot while something is new", () => {
    expect(home).toContain('<Ionicons name="heart-outline" size={26} color={colors.text} />');
    expect(home).toContain("{activityUnread > 0 && (");
    expect(home).toContain("const timer = setInterval(check, 60_000);");
  });

  it("lists likes and comments, and clears the dot when opened", () => {
    expect(modal).toContain('item.kind === "like" ? " liked your post." : ` commented: ${item.body}`');
    expect(modal).toContain("void postApi.markActivitySeen(accessToken)");
  });

  it("opens the post from a row, and the person from their photo", () => {
    expect(modal).toContain("leaveFor(() => openPost(item.post.id))");
    expect(modal).toContain("leaveFor(() => openProfile(item.actor.userId))");
  });
});

describe("tapping a post notification", () => {
  it("opens that post, whether the app is open or closed", () => {
    expect(sw).toContain('client.postMessage({ type: "open-post", postId })');
    expect(sw).toContain("`/?post=${encodeURIComponent(postId)}`");
    expect(app).toContain('if (data?.type === "open-post" && data.postId) setSharedPostId(data.postId);');
  });
});
