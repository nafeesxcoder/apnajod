/**
 * What a story is made of before it is saved: the photo's filter, the text
 * and stickers on top, and the drawing. Every position is a fraction of the
 * 9:16 story frame (0 to 1), and every size a fraction of its width, so the
 * editor on any screen and the saved photo at any size agree.
 */
export type FontKey = "classic" | "elegant" | "typewriter" | "caps";
export type TextBg = "none" | "solid" | "soft";

type Placed = { id: string; x: number; y: number; scale: number; rotation: number };
export type TextItem = Placed & { kind: "text"; text: string; font: FontKey; color: string; bg: TextBg };
export type StickerItem = Placed & { kind: "emoji" | "time" | "date"; value: string };
export type Item = TextItem | StickerItem;

export type Stroke = {
  id: string;
  tool: "pen" | "marker";
  color: string;
  /** Line width as a fraction of the frame's width. */
  size: number;
  /** x, y, x, y, ... as fractions of the frame. */
  points: number[];
};

export type EditorState = { filter: string; items: Item[]; strokes: Stroke[] };

export const EMPTY_STATE: EditorState = { filter: "normal", items: [], strokes: [] };

/** The story frame: 9 wide, 16 tall. */
export const FRAME_ASPECT = 9 / 16;
/** Text, emoji and time/date sizes at scale 1, as a fraction of the frame's width. */
export const TEXT_SIZE = 0.075;
export const EMOJI_SIZE = 0.17;
export const PILL_SIZE = 0.065;
/** Text wraps at this much of the frame's width (before it is scaled). */
export const TEXT_WRAP = 0.86;
export const LINE_HEIGHT = 1.25;
export const MIN_SCALE = 0.3;
export const MAX_SCALE = 5;

export const COLORS = ["#FFFFFF", "#000000", "#E8384F", "#FF8A3D", "#FFD43B", "#3DDC84", "#3A86FF", "#9D4EDD", "#FF70A6"];

export const FONT_LABELS: Record<FontKey, string> = {
  classic: "Classic",
  elegant: "Elegant",
  typewriter: "Typewriter",
  caps: "BOLD",
};

export const STROKE_SIZES = { S: 0.008, M: 0.016, L: 0.03 } as const;

let counter = 0;
export const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function isEdited(state: EditorState): boolean {
  return state.filter !== "normal" || state.items.length > 0 || state.strokes.length > 0;
}

export function addItem(state: EditorState, item: Item): EditorState {
  return { ...state, items: [...state.items.filter((each) => each.id !== item.id), item] };
}

export function updateItem(state: EditorState, id: string, patch: Partial<Placed> & Partial<TextItem>): EditorState {
  return {
    ...state,
    items: state.items.map((item) =>
      item.id === id
        ? ({
            ...item,
            ...patch,
            scale: clampScale(patch.scale ?? item.scale),
          } as Item)
        : item,
    ),
  };
}

export function removeItem(state: EditorState, id: string): EditorState {
  return { ...state, items: state.items.filter((item) => item.id !== id) };
}

/** Brings an item to the front (the one you touch goes on top). */
export function toFront(state: EditorState, id: string): EditorState {
  const item = state.items.find((each) => each.id === id);
  if (!item || state.items[state.items.length - 1]?.id === id) return state;
  return { ...state, items: [...state.items.filter((each) => each.id !== id), item] };
}

export const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

export function addStroke(state: EditorState, stroke: Stroke): EditorState {
  if (stroke.points.length < 2) return state;
  return { ...state, strokes: [...state.strokes, stroke] };
}

/**
 * The eraser: takes off every line that passes within `radius` of the
 * point (radius as a fraction of the frame's width).
 */
export function eraseAt(state: EditorState, x: number, y: number, radius: number): EditorState {
  // Heights are 16/9 of widths: measure in width units.
  const ty = y / FRAME_ASPECT;
  const near = (stroke: Stroke) => {
    const reach = (radius + stroke.size / 2) ** 2;
    const p = stroke.points;
    for (let i = 0; i < p.length; i += 2) {
      const ax = p[i]!;
      const ay = p[i + 1]! / FRAME_ASPECT;
      const bx = p[i + 2] ?? ax;
      const by = (p[i + 3] ?? p[i + 1]!) / FRAME_ASPECT;
      // Distance from the eraser to this piece of the line.
      const lx = bx - ax;
      const ly = by - ay;
      const t = lx || ly ? Math.max(0, Math.min(1, ((x - ax) * lx + (ty - ay) * ly) / (lx * lx + ly * ly))) : 0;
      const dx = ax + t * lx - x;
      const dy = ay + t * ly - ty;
      if (dx * dx + dy * dy <= reach) return true;
    }
    return false;
  };
  const strokes = state.strokes.filter((stroke) => !near(stroke));
  return strokes.length === state.strokes.length ? state : { ...state, strokes };
}

/** An item dragged into the bin at the bottom middle is deleted. */
export function overTrash(x: number, y: number): boolean {
  return y > 0.86 && Math.abs(x - 0.5) < 0.14;
}

/** Undo: up to 40 steps back. */
export function pushHistory(history: EditorState[], state: EditorState): EditorState[] {
  const next = [...history, state];
  return next.length > 40 ? next.slice(next.length - 40) : next;
}

/** Black or white text, whichever reads on this colour. */
export function readableOn(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? "#000000" : "#FFFFFF";
}

/** How a text item's colours are drawn: text colour and the box behind each line. */
export function textColors(item: Pick<TextItem, "color" | "bg">): { text: string; box: string | null } {
  if (item.bg === "solid") return { text: readableOn(item.color), box: item.color };
  if (item.bg === "soft") return { text: item.color, box: "rgba(0,0,0,0.55)" };
  return { text: item.color, box: null };
}

/**
 * Breaks text into lines no wider than maxWidth - at the line breaks you
 * typed, then between words, and inside a word only if one word is too long.
 * `measure` gives a string's width at the size being drawn.
 */
export function wrapLines(text: string, measure: (value: string) => number, maxWidth: number): string[] {
  const breakWord = (word: string): string[] => {
    const pieces: string[] = [];
    let piece = "";
    for (const char of Array.from(word)) {
      if (piece && measure(piece + char) > maxWidth) {
        pieces.push(piece);
        piece = char;
      } else piece += char;
    }
    pieces.push(piece);
    return pieces;
  };
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/ +/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (measure(word) <= maxWidth) line = word;
      else {
        const pieces = breakWord(word);
        lines.push(...pieces.slice(0, -1));
        line = pieces[pieces.length - 1] ?? "";
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Where the photo sits inside the 9:16 frame (fractions of the frame): fitted whole, centred. */
export function photoRect(photoWidth: number, photoHeight: number): { x: number; y: number; width: number; height: number } {
  const aspect = photoWidth / photoHeight;
  if (aspect > FRAME_ASPECT) {
    const height = FRAME_ASPECT / aspect;
    return { x: 0, y: (1 - height) / 2, width: 1, height };
  }
  const width = aspect / FRAME_ASPECT;
  return { x: (1 - width) / 2, y: 0, width, height: 1 };
}

/**
 * The saved story's size in pixels: the photo kept at its own sharpness
 * inside the 9:16 frame, at least 1080 wide and at most 2160 x 3840.
 */
export function outputSize(photoWidth: number, photoHeight: number): { width: number; height: number } {
  const rect = photoRect(photoWidth, photoHeight);
  const native = photoWidth / rect.width;
  const width = Math.round(Math.min(2160, Math.max(1080, native)));
  return { width, height: Math.round(width / FRAME_ASPECT) };
}

/** "11:38" and "13 Nov" for the time and date stickers. */
export function timeSticker(now = new Date()): string {
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
}
export function dateSticker(now = new Date()): string {
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][now.getMonth()];
  return `${now.getDate()} ${month}`;
}
