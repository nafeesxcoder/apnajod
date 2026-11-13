import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

import { FILTERS, cssFilter, filterColor } from "./filters";
import {
  EMPTY_STATE,
  addItem,
  addStroke,
  eraseAt,
  isEdited,
  outputSize,
  overTrash,
  photoRect,
  pushHistory,
  readableOn,
  removeItem,
  toFront,
  updateItem,
  wrapLines,
  type Item,
} from "./model";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8").replace(/\r\n/g, "\n");
const text = (id: string): Item => ({ id, kind: "text", text: id, font: "classic", color: "#FFFFFF", bg: "none", x: 0.5, y: 0.5, scale: 1, rotation: 0 });

describe("story editor", () => {
  it("knows an untouched photo from an edited one", () => {
    expect(isEdited(EMPTY_STATE)).toBe(false);
    expect(isEdited({ ...EMPTY_STATE, filter: "warm" })).toBe(true);
    expect(isEdited(addItem(EMPTY_STATE, text("a")))).toBe(true);
  });

  it("moves, sizes (within limits), stacks and removes texts and stickers", () => {
    let state = addItem(addItem(EMPTY_STATE, text("a")), text("b"));
    state = updateItem(state, "a", { x: 0.2, scale: 99 });
    expect(state.items.find((i) => i.id === "a")).toMatchObject({ x: 0.2, scale: 5 });
    expect(toFront(state, "a").items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(removeItem(state, "a").items.map((i) => i.id)).toEqual(["b"]);
  });

  it("deletes an item dropped on the bin at the bottom middle", () => {
    expect(overTrash(0.5, 0.92)).toBe(true);
    expect(overTrash(0.1, 0.92)).toBe(false);
    expect(overTrash(0.5, 0.5)).toBe(false);
  });

  it("erases a whole line the eraser touches, and keeps the rest", () => {
    let state = addStroke(EMPTY_STATE, { id: "1", tool: "pen", color: "#fff", size: 0.01, points: [0.1, 0.1, 0.2, 0.1] });
    state = addStroke(state, { id: "2", tool: "pen", color: "#fff", size: 0.01, points: [0.8, 0.8, 0.9, 0.8] });
    expect(eraseAt(state, 0.15, 0.1, 0.02).strokes.map((s) => s.id)).toEqual(["2"]);
    expect(eraseAt(state, 0.5, 0.5, 0.02)).toBe(state);
  });

  it("keeps up to 40 undo steps", () => {
    let history: (typeof EMPTY_STATE)[] = [];
    for (let i = 0; i < 50; i++) history = pushHistory(history, { ...EMPTY_STATE, filter: String(i) });
    expect(history).toHaveLength(40);
    expect(history[39]!.filter).toBe("49");
  });

  it("wraps text at spaces, and inside a word only when it must", () => {
    const measure = (value: string) => value.length * 10;
    expect(wrapLines("hello there friend", measure, 120)).toEqual(["hello there", "friend"]);
    expect(wrapLines("abcdefghijklmno", measure, 50)).toEqual(["abcde", "fghij", "klmno"]);
    expect(wrapLines("one\ntwo", measure, 500)).toEqual(["one", "two"]);
  });

  it("fits the photo whole inside the 9:16 story and keeps it sharp", () => {
    expect(photoRect(1080, 1920)).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    const wide = photoRect(4000, 3000);
    expect(wide.width).toBe(1);
    expect(wide.y).toBeCloseTo(0.289, 3);
    expect(outputSize(4000, 3000)).toEqual({ width: 2160, height: 3840 });
    expect(outputSize(600, 800)).toEqual({ width: 1080, height: 1920 });
  });

  it("has ten filters whose saved colours match the CSS preview", () => {
    expect(FILTERS).toHaveLength(10);
    expect(cssFilter([])).toBe("none");
    expect(cssFilter(FILTERS.find((f) => f.id === "mono")!.steps)).toBe("grayscale(1) contrast(1.1)");
    const [r, g, b] = filterColor([0.8, 0.2, 0.4], [{ type: "grayscale", amount: 1 }]);
    expect(r).toBeCloseTo(g, 5);
    expect(g).toBeCloseTo(b, 5);
    expect(filterColor([0.5, 0.5, 0.5], [{ type: "brightness", amount: 2 }])).toEqual([1, 1, 1]);
  });

  it("puts dark text on a light box and light text on a dark one", () => {
    expect(readableOn("#FFD43B")).toBe("#000000");
    expect(readableOn("#3A86FF")).toBe("#FFFFFF");
  });

  it("uploads an untouched photo as picked and only bakes an edited one", () => {
    const editor = read("StoryEditor.tsx");
    expect(editor).toContain("isEdited(state) ? (made = await bakeStory(");
    expect(read("bake.native.ts")).toContain("captureRef(");
    expect(read("bake.ts")).toContain('canvas.toBlob(resolve, "image/jpeg", 0.92)');
  });
});
