import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Image: { getSize: vi.fn() } }));

const read = (path: string) =>
  readFileSync(join(__dirname, "..", "..", path), "utf8").replace(/\r\n/g, "\n");

const app = read("app/MilaanApp.tsx");
const chat = read("features/chat/ChatFeature.tsx");
const person = read("features/social/screens/PersonScreen.tsx");
const section = read("features/profile/components/PostsSection.tsx");
const socialApi = read("api/socialApi.ts");

describe("opening someone's profile, like Instagram", () => {
  it("opens from the top of a chat and goes back to the chat", () => {
    expect(app).toContain("onOpenPartnerProfile={");
    expect(app).toContain("() => openPerson(conversationPartner.id)");
    expect(app).toContain("if (screen !== \"person\") setPersonReturn(screen);");
    expect(app).toContain("onBack={() => setScreen(personReturn)}");
  });

  it("the name in the chat header opens the profile too", () => {
    expect(chat).toContain("onOpenPartnerProfile ? onOpenPartnerProfile() : setSettingsOpen(true)");
  });

  it("shows their posts and how many, but never a match count", () => {
    expect(person).toContain("<PostsSection accessToken={accessToken} userId={userId}");
    expect(person).toContain('{postCount === 1 ? "post" : "posts"}');
    expect(socialApi).not.toMatch(/followers|following:/);
    expect(person).not.toMatch(/matches\b.*count|matchCount/i);
  });
});

describe("private accounts", () => {
  it("say so instead of showing the posts", () => {
    expect(section).toContain("This account is private");
    expect(section).toContain("Match with them to see their posts.");
    expect(section).toContain("setLocked(result.locked)");
  });
});

describe("posts are shown whole", () => {
  it("at their real shape, between 9:16 and 1.91:1", async () => {
    const { shownAspect } = await import("../profile/components/PostImage");
    expect(shownAspect(1080, 1350)).toBeCloseTo(0.8);
    expect(shownAspect(1080, 1920)).toBeCloseTo(9 / 16);
    expect(shownAspect(1080, 3000)).toBeCloseTo(9 / 16);
    expect(shownAspect(4000, 1000)).toBeCloseTo(1.91);
    expect(shownAspect(0, 0, 1)).toBe(1);
  });

  it("the post viewer uses it (through PostCard)", () => {
    expect(section).toContain("<PostCard");
    expect(read("features/posts/PostCard.tsx")).toContain("<PostImage uri={post.media_url} aspect={post.aspect_ratio} />");
  });
});
