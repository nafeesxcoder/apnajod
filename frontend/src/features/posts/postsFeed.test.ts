import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const home = read("../discovery/screens/HomeScreen.tsx");
const feed = read("PostsFeed.tsx");

describe("posts on Home", () => {
  it("sit under Home's cards, with pull-to-refresh and more on scroll", () => {
    expect(home).toContain("<PostsFeed accessToken={accessToken} loadMoreSignal={feedMore} reloadKey={feedReload} />");
    expect(home).toContain("setFeedReload((n) => n + 1);");
    expect(home).toContain("contentSize.height - 900");
  });

  it("use the full Instagram post card and never show a post twice", () => {
    expect(feed).toContain("<PostCard");
    expect(feed).toContain("page.posts.filter((post) => !seen.has(post.id))");
  });

  it("say so when there is nothing yet, and when you are all caught up", () => {
    expect(feed).toContain("No posts yet.");
    expect(feed).toContain("You are all caught up");
  });
});
