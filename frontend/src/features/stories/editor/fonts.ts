import { Platform } from "react-native";

import { fonts } from "../../../theme";
import { type FontKey, LINE_HEIGHT, TEXT_WRAP, wrapLines } from "./model";

/** How each story font is drawn on screen (family) and in the saved photo (css). */
export const STORY_FONTS: Record<FontKey, { family: string; css: string; upper: boolean }> = {
  classic: { family: fonts.bodyBold, css: `"${fonts.bodyBold}", sans-serif`, upper: false },
  elegant: { family: fonts.display, css: `"${fonts.display}", serif`, upper: false },
  typewriter: {
    family: Platform.OS === "web" ? '"Courier New", Courier, monospace' : Platform.OS === "ios" ? "Courier" : "monospace",
    css: '"Courier New", Courier, monospace',
    upper: false,
  },
  caps: { family: fonts.bodyBold, css: `"${fonts.bodyBold}", sans-serif`, upper: true },
};

export const EMOJI_CSS = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export const shown = (font: FontKey, text: string) => (STORY_FONTS[font].upper ? text.toUpperCase() : text);

let measurer: CanvasRenderingContext2D | null = null;

/** Measures text in the browser (the same way the saved photo will be drawn). */
export function measureFor(css: string, px: number): ((value: string) => number) | null {
  if (Platform.OS !== "web" || typeof document === "undefined") return null;
  if (!measurer) measurer = document.createElement("canvas").getContext("2d");
  if (!measurer) return null;
  const context = measurer;
  return (value: string) => {
    context.font = `${px}px ${css}`;
    return context.measureText(value).width;
  };
}

/**
 * A text item's lines at a frame `width` pixels wide. In the browser the
 * lines are worked out here, so the screen and the saved photo break in
 * the same places; on a phone the app wraps them itself (the photo is a
 * picture of the screen there).
 */
export function textLines(font: FontKey, text: string, size: number, width: number): string[] {
  const value = shown(font, text);
  const measure = measureFor(STORY_FONTS[font].css, size);
  return measure ? wrapLines(value, measure, TEXT_WRAP * width) : value.split("\n");
}

/** Box padding around each text line, as fractions of the font size. */
export const TEXT_PAD = { x: 0.3, y: 0.08, radius: 0.24 };
export const lineBoxHeight = (size: number) => size * LINE_HEIGHT + 2 * TEXT_PAD.y * size;
/** Padding round the time/date pill, as fractions of its font size. */
export const PILL_PAD = { x: 0.5, y: 0.22 };
