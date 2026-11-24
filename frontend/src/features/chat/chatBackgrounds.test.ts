import { describe, expect, it } from "vitest";
import { CHAT_BACKGROUNDS, backgroundFor } from "./chatBackgrounds";

describe("chat backgrounds", () => {
  it("has twenty backgrounds with unique ids the server accepts", () => {
    expect(CHAT_BACKGROUNDS).toHaveLength(20);
    const ids = CHAT_BACKGROUNDS.map((background) => background.id);
    expect(new Set(ids).size).toBe(20);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,32}$/);
  });

  it("gives every background two colours and a name", () => {
    for (const background of CHAT_BACKGROUNDS) {
      expect(background.colors).toHaveLength(2);
      expect(background.name.length).toBeGreaterThan(0);
    }
  });

  it("falls back to the classic cream for a missing or unknown id", () => {
    expect(backgroundFor(undefined).id).toBe("classic");
    expect(backgroundFor("not-a-background").id).toBe("classic");
    expect(backgroundFor("night-sky").id).toBe("night-sky");
  });
});
