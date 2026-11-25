import { describe, expect, it } from "vitest";
import { BACKGROUND_CHOICES, CHAT_BACKGROUNDS, backgroundFor } from "./chatBackgrounds";

describe("chat backgrounds", () => {
  it("has thirteen themes with unique ids the server accepts", () => {
    expect(CHAT_BACKGROUNDS).toHaveLength(13);
    const ids = CHAT_BACKGROUNDS.map((background) => background.id);
    expect(new Set(ids).size).toBe(13);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,32}$/);
  });

  it("gives every theme two colours and a name", () => {
    for (const background of CHAT_BACKGROUNDS) {
      expect(background.colors).toHaveLength(2);
      expect(background.name.length).toBeGreaterThan(0);
    }
  });

  it("has a photo for the five photo themes and none for the gradients", () => {
    const withPhoto = CHAT_BACKGROUNDS.filter((background) => background.image);
    expect(withPhoto).toHaveLength(5);
    expect(backgroundFor("blush")?.image).toBeUndefined();
    expect(backgroundFor("sky-hands")?.image).toBeDefined();
  });

  it("shows no background for the plain option, a missing id, or an unknown one", () => {
    expect(backgroundFor(undefined)).toBeNull();
    expect(backgroundFor("classic")).toBeNull();
    expect(backgroundFor("not-a-background")).toBeNull();
    expect(backgroundFor("blush")?.id).toBe("blush");
  });

  it("offers the plain option first, then the thirteen", () => {
    expect(BACKGROUND_CHOICES).toHaveLength(14);
    expect(BACKGROUND_CHOICES[0]!.id).toBe("classic");
  });
});
