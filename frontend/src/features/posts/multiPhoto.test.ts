import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const card = read("PostCard.tsx");
const sheet = read("../profile/components/NewPostSheet.tsx");
const add = read("../profile/components/AddPostButton.tsx");
const grid = read("../profile/components/PostsSection.tsx");

describe("a post with several photos", () => {
  it("lets you pick up to 5 at once on the web", () => {
    expect(add).toContain("allowsMultipleSelection: true,");
    expect(add).toContain("selectionLimit: 5,");
  });

  it("sets each photo in the frame, all at the same size", () => {
    expect(sheet).toContain("onPress={() => showPhoto(i)}");
    expect(sheet).toContain("placed.current.get(item.uri) ?? { offset: centredOffset(item, frame, 1), zoom: 1 }");
  });

  it("uploads them one at a time and sends them all", () => {
    expect(sheet).toContain("for (const uri of croppedUris) urls.push(await uploadPhoto(uri, accessToken));");
    expect(sheet).toContain("postApi.create(accessToken, urls[0]!, caption.trim(), shape.aspect, urls)");
  });

  it("swipes, with a counter, dots and arrows", () => {
    expect(card).toContain("pagingEnabled");
    expect(card).toContain("{slide + 1}/{photos.length}");
    expect(card).toContain('<SlideArrow side="right"');
    expect(card).toContain("backgroundColor: i === slide ? palette.crimson : palette.rule");
  });

  it("shows the several-photos icon in the grid", () => {
    expect(grid).toContain('<Ionicons name="copy" size={16}');
  });
});
