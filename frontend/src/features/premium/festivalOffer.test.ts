import { describe, expect, it } from "vitest";

import { festivalOffer, festivalOfferId } from "./festivalOffer";

describe("festival offer on Google Play", () => {
  it("looks for the Play offer named after the percent", () => {
    expect(festivalOfferId(50)).toBe("festival50");
    expect(festivalOfferId(0)).toBeNull();
    expect(festivalOfferId(null)).toBeNull();
  });

  it("uses the offer only when Play has it", () => {
    const product = { offers: { festival50: { token: "t50", displayPrice: "₹99" } } };
    expect(festivalOffer(product, 50)).toEqual({ token: "t50", displayPrice: "₹99" });
    expect(festivalOffer(product, 30)).toBeNull();
    expect(festivalOffer({}, 50)).toBeNull();
    expect(festivalOffer(product, null)).toBeNull();
  });
});
