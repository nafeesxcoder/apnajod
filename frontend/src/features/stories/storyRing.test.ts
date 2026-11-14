import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: vi.fn(async () => null), setItem: vi.fn() } }));
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

import { statusOf } from "./storyStore";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const person = (userId: string, ids: string[]) => ({
  user: { userId, username: userId, name: userId, avatarUrl: null },
  mine: false,
  stories: ids.map((id) => ({ id, mediaUrl: "", createdAt: "", expiresAt: "" })),
});

describe("story rings on photos", () => {
  it("is coloured for a story you have not seen, grey once seen, none without a story", () => {
    const people = [person("a", ["s1", "s2"]), person("b", ["s3"])];
    expect(statusOf(people, new Set(["s1"]), "a")).toBe("new");
    expect(statusOf(people, new Set(["s3"]), "b")).toBe("seen");
    expect(statusOf(people, new Set(), "c")).toBe("none");
  });

  it("shows on posts, profiles and the chat header, and plays from anywhere", () => {
    expect(read("../posts/PostCard.tsx")).toContain("<StoryRing userId={author.userId} size={34}>");
    expect(read("../social/screens/PersonScreen.tsx")).toContain("<StoryRing userId={userId} size={132}>");
    expect(read("../chat/ChatFeature.tsx")).toContain("<StoryRing userId={match.id} size={42}>");
    expect(read("StoryRing.tsx")).toContain("onPress={() => openStoriesOf(userId)}");
    expect(read("../../app/MilaanApp.tsx")).toContain("<StoryHost accessToken={accessToken} />");
  });
});
