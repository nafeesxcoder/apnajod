import { describe, expect, it } from "vitest";
import { likeCardWidth, likeColumnCount } from "./likesLayout";

describe("likes layout", () => {
  it("puts three cards in a row on a desktop, two on a tablet, one on a phone", () => {
    expect(likeColumnCount({ isWide: true, isDesktop: true })).toBe(3);
    expect(likeColumnCount({ isWide: true, isDesktop: false })).toBe(2);
    expect(likeColumnCount({ isWide: false, isDesktop: false })).toBe(1);
  });

  it("gives each card a share of the row that leaves room for the gaps", () => {
    expect(likeCardWidth(3)).toBe("31%");
    expect(likeCardWidth(2)).toBe("48%");
    expect(likeCardWidth(1)).toBe("100%");
  });
});
