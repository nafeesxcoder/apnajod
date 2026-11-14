import type { RefObject } from "react";

import { fonts } from "../../../theme";
import { filterById, filterPixels, cssFilter } from "./filters";
import { EMOJI_CSS, PILL_PAD, STORY_FONTS, TEXT_PAD, lineBoxHeight, textLines } from "./fonts";
import {
  EMOJI_SIZE,
  LINE_HEIGHT,
  MUSIC_SIZE,
  PILL_SIZE,
  TEXT_SIZE,
  isLive,
  type EditorState,
  outputSize,
  photoRect,
  textColors,
} from "./model";

export type BakeInput = {
  uri: string;
  state: EditorState;
  /** The two colours of the background behind the photo (top, bottom). */
  backdrop: [string, string];
  /** The editor's frame on screen - used on phones, which photograph it. */
  frameRef?: RefObject<unknown>;
};

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That photo could not be opened."));
    image.src = uri;
  });
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

/**
 * The finished story as one JPEG, drawn the same way the editor shows it:
 * the 9:16 frame, the background, the photo with its filter, the drawing,
 * then the text and stickers. Returns a blob: URL for the upload.
 */
export async function bakeStory({ uri, state, backdrop }: BakeInput): Promise<string> {
  // A text story has no photo: just the background and what is on it.
  const image = uri ? await loadImage(uri) : null;
  const out = image ? outputSize(image.naturalWidth, image.naturalHeight) : { width: 1080, height: 1920 };
  const canvas = document.createElement("canvas");
  canvas.width = out.width;
  canvas.height = out.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot make a story.");
  const W = out.width;
  const H = out.height;

  // Fonts used by the text must be ready before drawing.
  if (document.fonts?.load) {
    const families = new Set(state.items.filter((item) => item.kind === "text").map((item) => (item.kind === "text" ? STORY_FONTS[item.font].css : "")));
    families.add(`"${fonts.bodyBold}"`);
    await Promise.all([...families].map((css) => document.fonts.load(`40px ${css}`).catch(() => undefined)));
  }

  const gradient = context.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, backdrop[0]);
  gradient.addColorStop(1, backdrop[1]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, W, H);

  if (image) {
    const rect = photoRect(image.naturalWidth, image.naturalHeight);
    const px = { x: rect.x * W, y: rect.y * H, w: rect.width * W, h: rect.height * H };
    const steps = filterById(state.filter).steps;
    context.imageSmoothingQuality = "high";
    const canFilter = typeof (context as { filter?: unknown }).filter === "string";
    if (canFilter) context.filter = cssFilter(steps);
    context.drawImage(image, px.x, px.y, px.w, px.h);
    if (canFilter) context.filter = "none";
    else if (steps.length) {
      const x = Math.round(px.x);
      const y = Math.round(px.y);
      const pixels = context.getImageData(x, y, Math.round(px.w), Math.round(px.h));
      filterPixels(pixels.data, steps);
      context.putImageData(pixels, x, y);
    }
  }

  // The drawing.
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const stroke of state.strokes) {
    context.save();
    context.globalAlpha = stroke.tool === "marker" ? 0.5 : 1;
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = stroke.size * W;
    const p = stroke.points;
    if (p.length === 2) {
      context.beginPath();
      context.arc(p[0]! * W, p[1]! * H, (stroke.size * W) / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.moveTo(p[0]! * W, p[1]! * H);
      for (let i = 2; i < p.length; i += 2) context.lineTo(p[i]! * W, p[i + 1]! * H);
      context.stroke();
    }
    context.restore();
  }

  // Text and stickers, each turned and sized round its own middle.
  context.textAlign = "center";
  context.textBaseline = "middle";
  // Poll, question and @mention stickers are not drawn in: they stay live on top.
  for (const item of state.items) {
    if (isLive(item)) continue;
    context.save();
    context.translate(item.x * W, item.y * H);
    context.rotate((item.rotation * Math.PI) / 180);
    context.scale(item.scale, item.scale);
    if (item.kind === "text") {
      const size = TEXT_SIZE * W;
      const font = STORY_FONTS[item.font];
      const { text, box } = textColors(item);
      const lines = textLines(item.font, item.text, size, W);
      const lineH = lineBoxHeight(size);
      let top = -(lines.length * lineH) / 2;
      context.font = `${size}px ${font.css}`;
      for (const line of lines) {
        const width = context.measureText(line).width + 2 * TEXT_PAD.x * size;
        if (box) {
          context.fillStyle = box;
          roundRect(context, -width / 2, top, width, lineH, TEXT_PAD.radius * size);
          context.fill();
        }
        context.fillStyle = text;
        context.fillText(line, 0, top + lineH / 2);
        top += lineH;
      }
    } else if (item.kind === "emoji") {
      const size = EMOJI_SIZE * W;
      context.font = `${size}px ${EMOJI_CSS}`;
      context.fillText(item.value, 0, 0);
    } else {
      const size = (item.kind === "music" ? MUSIC_SIZE : PILL_SIZE) * W;
      context.font = `${size}px "${fonts.bodyBold}", sans-serif`;
      const width = context.measureText(item.value).width + 2 * PILL_PAD.x * size;
      const height = size * LINE_HEIGHT + 2 * PILL_PAD.y * size;
      context.fillStyle = "#FFFFFF";
      roundRect(context, -width / 2, -height / 2, width, height, size);
      context.fill();
      context.fillStyle = "#14202E";
      context.fillText(item.value, 0, 0);
    }
    context.restore();
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("Your story could not be made.");
  return URL.createObjectURL(blob);
}

/** Two colours from the photo's top and bottom, darkened, for the background behind it. */
export async function backdropFor(uri: string): Promise<[string, string]> {
  try {
    const image = await loadImage(uri);
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 2;
    const context = canvas.getContext("2d");
    if (!context) throw new Error();
    context.drawImage(image, 0, 0, 1, 2);
    const d = context.getImageData(0, 0, 1, 2).data;
    const shade = (i: number) => `rgb(${Math.round(d[i]! * 0.55)}, ${Math.round(d[i + 1]! * 0.55)}, ${Math.round(d[i + 2]! * 0.55)})`;
    return [shade(0), shade(4)];
  } catch {
    return ["#1B1B1F", "#0B0B0D"];
  }
}
