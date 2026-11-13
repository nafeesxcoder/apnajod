import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(__dirname, "screens", "FindPeopleScreen.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("Find people look (Navy x Crimson)", () => {
  it("uses the shared white card, ring and motion pieces", () => {
    expect(source).toContain('from "../../../components/brand"');
    expect(source).toContain("...whiteCard");
    expect(source).toContain('<SpinRing size={50} spin={false}>');
    expect(source).toContain("<Reveal");
    expect(source).toContain("<PressScale");
  });

  it("keeps text readable on coloured buttons", () => {
    // Navy/crimson and WhatsApp green buttons carry white text, never ink.
    expect(source).toMatch(/backgroundColor: palette\.crimson,\s+minHeight: 44/);
    expect(source).toMatch(/color: "#FFFFFF",[\s\S]{0,400}Check my contacts/);
    expect(source).toMatch(/color: "#FFFFFF",[\s\S]{0,400}Invite\n/);
    expect(source).not.toContain("palette.clay");
  });

  it("gives the back button a 44px target", () => {
    expect(source).toMatch(/accessibilityLabel="Go back"[\s\S]{0,200}width: 44,\s+height: 44/);
  });
});
