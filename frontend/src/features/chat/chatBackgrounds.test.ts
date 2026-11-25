import { describe, expect, it } from "vitest";
import { BACKGROUND_CHOICES, CHAT_BACKGROUNDS, backgroundFor } from "./chatBackgrounds";

describe("chat backgrounds", () => {
  it("has eight gradient backgrounds with unique ids the server accepts", () => {
    expect(CHAT_BACKGROUNDS).toHaveLength(8);
    const ids = CHAT_BACKGROUNDS.map((background) => background.id);
    expect(new Set(ids).size).toBe(8);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,32}$/);
  });

  it("gives every background two colours and a name", () => {
    for (const background of CHAT_BACKGROUNDS) {
      expect(background.colors).toHaveLength(2);
      expect(background.name.length).toBeGreaterThan(0);
    }
  });

  it("shows no background for the plain option, a missing id, or an unknown one", () => {
    expect(backgroundFor(undefined)).toBeNull();
    expect(backgroundFor("classic")).toBeNull();
    expect(backgroundFor("not-a-background")).toBeNull();
    expect(backgroundFor("blush")?.id).toBe("blush");
  });

  it("offers the plain option first, then the eight", () => {
    expect(BACKGROUND_CHOICES).toHaveLength(9);
    expect(BACKGROUND_CHOICES[0]!.id).toBe("classic");
  });
});
