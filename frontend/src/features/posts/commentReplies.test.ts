import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { commentThreads } from "./postFormat";
import { filterInvitees } from "../ludo/ludoText";

const read = (p: string) => readFileSync(join(__dirname, "..", "..", "..", p), "utf8");

describe("replies to comments", () => {
  it("puts each reply under its comment, in order", () => {
    const threads = commentThreads([
      { id: "a" },
      { id: "b" },
      { id: "r1", parentId: "a" },
      { id: "r2", parentId: "b" },
      { id: "r3", parentId: "a" },
    ]);
    expect(threads.map((t) => [t.comment.id, t.replies.map((r) => r.id)])).toEqual([
      ["a", ["r1", "r3"]],
      ["b", ["r2"]],
    ]);
  });

  it("shows a reply on its own when its comment is not in the list", () => {
    expect(commentThreads([{ id: "r1", parentId: "gone" }]).map((t) => t.comment.id)).toEqual(["r1"]);
  });

  it("has a Reply button, a Replying-to bar, and sends whom it answers", () => {
    const sheet = read("src/features/posts/PostSheets.tsx");
    expect(sheet).toContain("accessibilityLabel={`Reply to ${item.author.username}`}");
    expect(sheet).toContain('accessibilityLabel="Cancel reply"');
    expect(sheet).toContain("postApi.addComment(accessToken, post.id, body, replyTarget?.id)");
    expect(sheet).toContain("c.parentId !== comment.id");
    expect(read("src/api/postApi.ts")).toContain("JSON.stringify(replyTo ? { body, replyTo } : { body })");
  });

  it("says 'replied to your comment' in Activity", () => {
    expect(read("src/features/posts/ActivityList.tsx")).toContain('return ` replied to your comment: ${item.body ?? ""}`;');
  });
});

describe("finding people to invite to Ludo", () => {
  const people = [
    { name: "Anaya", username: "anaya_s", city: "Delhi" },
    { name: "Meera", username: "meera", city: "Jaipur" },
  ];
  it("matches a name, an @username or a city, any case", () => {
    expect(filterInvitees(people, "ana").map((p) => p.name)).toEqual(["Anaya"]);
    expect(filterInvitees(people, "@MEE").map((p) => p.name)).toEqual(["Meera"]);
    expect(filterInvitees(people, "jaipur").map((p) => p.name)).toEqual(["Meera"]);
    expect(filterInvitees(people, "  ")).toHaveLength(2);
    expect(filterInvitees(people, "zzz")).toEqual([]);
  });

  it("has a search box on the new game and invite-more lists", () => {
    const screen = read("src/features/ludo/LudoScreen.tsx");
    expect(screen).toContain('accessibilityLabel="Search people to invite"');
    expect(screen).toContain("...filterInvitees(matches, search)");
    expect(screen).toContain("filterInvitees(invitable, search)");
  });
});
