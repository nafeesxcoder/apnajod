import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const home = read("../discovery/screens/HomeScreen.tsx");
const modal = read("ActivityList.tsx");
const likes = read("../discovery/screens/LikesScreen.tsx");
const sw = read("../../../public/sw.js");
const app = read("../../app/MilaanApp.tsx");

describe("Activity", () => {
  it("is one time-sorted list on Notifications; its count adds to the bell on Home", () => {
    // No second inbox icon on Home: the heart is gone, the bell has both.
    expect(home).not.toContain('<Ionicons name="heart-outline" size={26} color={colors.text} />');
    expect(home).toContain("const bellCount = notificationCount + activityUnread;");
    expect(home).toContain("const timer = setInterval(check, 60_000);");
    // No tabs: likes, matches and activity share one scroll.
    expect(likes).not.toContain('accessibilityRole="tablist"');
    expect(likes).toContain('<ActivityRow item={row.item!} />');
    // Every row slides to show its ••• and delete buttons.
    expect(likes).toContain('<SwipeRow');
  });

  it("lists post likes and comments, story likes, answers and mentions, and clears the count when opened", () => {
    for (const words of [" liked your post.", " commented: ", " liked your story.", " answered your question: ", " mentioned you in their story."])
      expect(modal).toContain(words);
    expect(modal).toContain("void postApi.markActivitySeen(accessToken)");
  });

  it("opens the post or story from a row, and the person from their photo", () => {
    expect(modal).toContain("onPress={() => openItem(item)}");
    expect(modal).toContain("if (item.post) openPost(item.post.id);");
    expect(modal).toContain("openStoriesOf(item.actor.userId)");
    expect(modal).toContain("openMyStories()");
    expect(modal).toContain("onPress={() => openProfile(item.actor.userId)}");
  });
});

describe("tapping a post notification", () => {
  it("opens that post, whether the app is open or closed", () => {
    expect(sw).toContain('client.postMessage({ type: "open-post", postId })');
    expect(sw).toContain("`/?post=${encodeURIComponent(postId)}`");
    expect(app).toContain('if (data?.type === "open-post" && data.postId) setSharedPostId(data.postId);');
  });
});
