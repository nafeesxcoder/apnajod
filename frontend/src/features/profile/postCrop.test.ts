import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  POST_SHAPES,
  centredOffset,
  clampOffset,
  cropRect,
  frameSize,
  outputSize,
  refit,
} from "./postCrop";

const photo = { width: 4000, height: 3000 }; // a phone's landscape photo

describe("post sizes (like Instagram)", () => {
  it("offers square, portrait 4:5 and landscape 1.91:1", () => {
    expect(POST_SHAPES.map((s) => [s.label, s.ratio, s.aspect])).toEqual([
      ["Square", "1:1", 1],
      ["Portrait", "4:5", 0.8],
      ["Landscape", "1.91:1", 1.91],
    ]);
  });

  it("saves posts 1080 wide in the chosen shape", () => {
    expect(outputSize(1)).toEqual({ width: 1080, height: 1080 });
    expect(outputSize(0.8)).toEqual({ width: 1080, height: 1350 });
    expect(outputSize(1.91)).toEqual({ width: 1080, height: 565 });
  });

  it("fits the frame inside the space it is given", () => {
    expect(frameSize(1, 358, 440)).toEqual({ width: 358, height: 358 });
    expect(frameSize(0.8, 358, 400)).toEqual({ width: 320, height: 400 });
  });
});

describe("cropping", () => {
  const frame = { width: 300, height: 300 };

  it("starts centred and crops the middle square of the photo", () => {
    const rect = cropRect(centredOffset(photo, frame, 1), photo, frame, 1);
    expect(rect.width).toBeCloseTo(3000);
    expect(rect.height).toBeCloseTo(3000);
    expect(rect.x).toBeCloseTo(500);
    expect(rect.y).toBeCloseTo(0);
  });

  it("never lets the photo be dragged off the frame", () => {
    expect(clampOffset({ x: 50, y: 50 }, photo, frame, 1)).toEqual({ x: 0, y: 0 });
    const far = clampOffset({ x: -9999, y: -9999 }, photo, frame, 1);
    expect(far.x).toBeCloseTo(-100);
    expect(far.y).toBeCloseTo(0);
  });

  it("dragged fully left, crops the right edge of the photo", () => {
    const rect = cropRect({ x: -100, y: 0 }, photo, frame, 1);
    expect(rect.x + rect.width).toBeCloseTo(4000);
  });

  it("zooming in crops a smaller part around the same centre", () => {
    const from = { frame, zoom: 1 };
    const to = { frame, zoom: 2 };
    const zoomed = refit(centredOffset(photo, frame, 1), photo, from, to);
    const rect = cropRect(zoomed, photo, frame, 2);
    expect(rect.width).toBeCloseTo(1500);
    expect(rect.x + rect.width / 2).toBeCloseTo(2000);
    expect(rect.y + rect.height / 2).toBeCloseTo(1500);
  });
});

describe("the New post sheet", () => {
  const sheet = readFileSync(join(__dirname, "components", "NewPostSheet.tsx"), "utf8").replace(/\r\n/g, "\n");

  it("sends the chosen shape with the post", () => {
    expect(sheet).toContain("postApi.create(accessToken, urls[0]!, caption.trim(), shape.aspect, urls)");
  });

  it("uploads only when Share is pressed", () => {
    const shareAt = sheet.indexOf("const share = async");
    expect(sheet.indexOf("uploadPhoto(")).toBeGreaterThan(shareAt);
  });

  it("opens the phone's own crop screen at the chosen size in the app", () => {
    expect(sheet).toContain("allowsEditing: true");
    expect(sheet).toMatch(/aspect,\n\s+quality/);
  });
});
