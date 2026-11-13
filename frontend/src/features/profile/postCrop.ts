/**
 * The arithmetic behind cropping a post, kept apart from the screen so it
 * can be tested on its own.
 *
 * A post is cropped like Instagram: the member picks one of three shapes,
 * the photo fills a frame of that shape, and they drag (and zoom) it until
 * the part they want is inside. Everything here works in two spaces - the
 * frame on screen, and the photo's own pixels - and converts between them.
 */

export type PostShape = { id: "square" | "portrait" | "landscape"; label: string; ratio: string; aspect: number };

/** Width / height. The same three shapes the server accepts. */
export const POST_SHAPES: PostShape[] = [
  { id: "square", label: "Square", ratio: "1:1", aspect: 1 },
  { id: "portrait", label: "Portrait", ratio: "4:5", aspect: 0.8 },
  { id: "landscape", label: "Landscape", ratio: "1.91:1", aspect: 1.91 },
];

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

/** Posts are saved 1080 pixels wide, like Instagram. */
export const OUTPUT_WIDTH = 1080;

export type Size = { width: number; height: number };
export type Offset = { x: number; y: number };

/** The frame on screen for a shape, as wide as allowed and never taller than maxHeight. */
export function frameSize(aspect: number, maxWidth: number, maxHeight: number): Size {
  let width = maxWidth;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

/** The scale at which the photo just covers the frame (zoom 1). */
export function coverScale(photo: Size, frame: Size): number {
  return Math.max(frame.width / photo.width, frame.height / photo.height);
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** The photo's size on screen at a zoom. */
export function shownSize(photo: Size, frame: Size, zoom: number): Size {
  const scale = coverScale(photo, frame) * clampZoom(zoom);
  return { width: photo.width * scale, height: photo.height * scale };
}

/**
 * Keeps the photo covering the frame: its top-left corner (relative to the
 * frame's) can only move between "flush right/bottom" and "flush left/top".
 */
export function clampOffset(offset: Offset, photo: Size, frame: Size, zoom: number): Offset {
  const shown = shownSize(photo, frame, zoom);
  const clamp = (value: number, min: number) => Math.min(0, Math.max(min, value));
  return { x: clamp(offset.x, frame.width - shown.width), y: clamp(offset.y, frame.height - shown.height) };
}

/** The photo centred in the frame. */
export function centredOffset(photo: Size, frame: Size, zoom: number): Offset {
  const shown = shownSize(photo, frame, zoom);
  return { x: (frame.width - shown.width) / 2, y: (frame.height - shown.height) / 2 };
}

/**
 * Moves to a new zoom (or a new frame) keeping the same point of the photo
 * in the middle of the frame, so zooming does not throw the picture around.
 */
export function refit(
  offset: Offset,
  photo: Size,
  from: { frame: Size; zoom: number },
  to: { frame: Size; zoom: number },
): Offset {
  const fromScale = coverScale(photo, from.frame) * clampZoom(from.zoom);
  const toScale = coverScale(photo, to.frame) * clampZoom(to.zoom);
  // The photo pixel under the centre of the old frame...
  const px = (from.frame.width / 2 - offset.x) / fromScale;
  const py = (from.frame.height / 2 - offset.y) / fromScale;
  // ...goes under the centre of the new one.
  const next = { x: to.frame.width / 2 - px * toScale, y: to.frame.height / 2 - py * toScale };
  return clampOffset(next, photo, to.frame, to.zoom);
}

/** The part of the photo inside the frame, in the photo's own pixels. */
export function cropRect(offset: Offset, photo: Size, frame: Size, zoom: number) {
  const scale = coverScale(photo, frame) * clampZoom(zoom);
  const safe = clampOffset(offset, photo, frame, zoom);
  const width = Math.min(photo.width, frame.width / scale);
  const height = Math.min(photo.height, frame.height / scale);
  return {
    x: Math.max(0, Math.min(photo.width - width, -safe.x / scale)),
    y: Math.max(0, Math.min(photo.height - height, -safe.y / scale)),
    width,
    height,
  };
}

/** The saved image's size for a shape. */
export function outputSize(aspect: number): Size {
  return { width: OUTPUT_WIDTH, height: Math.round(OUTPUT_WIDTH / aspect) };
}

/** Distance between two touches, for pinch-to-zoom. */
export function touchDistance(a: { pageX: number; pageY: number }, b: { pageX: number; pageY: number }): number {
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}
