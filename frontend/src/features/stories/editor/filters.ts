/**
 * Story filters, Instagram-style. Each is a list of CSS filter steps, so the
 * live preview (a CSS filter on the photo) and the saved photo (the same
 * steps drawn into a canvas) look the same.
 */
export type FilterStep =
  | { type: "brightness" | "contrast" | "saturate" | "grayscale" | "sepia"; amount: number }
  | { type: "hue-rotate"; deg: number };

export type StoryFilter = { id: string; name: string; steps: FilterStep[] };

const b = (amount: number): FilterStep => ({ type: "brightness", amount });
const c = (amount: number): FilterStep => ({ type: "contrast", amount });
const s = (amount: number): FilterStep => ({ type: "saturate", amount });
const g = (amount: number): FilterStep => ({ type: "grayscale", amount });
const sep = (amount: number): FilterStep => ({ type: "sepia", amount });
const h = (deg: number): FilterStep => ({ type: "hue-rotate", deg });

export const FILTERS: StoryFilter[] = [
  { id: "normal", name: "Normal", steps: [] },
  { id: "warm", name: "Warm", steps: [sep(0.22), s(1.25), h(-8), b(1.03)] },
  { id: "cool", name: "Cool", steps: [b(1.02), c(1.05), s(0.9), h(12)] },
  { id: "vivid", name: "Vivid", steps: [s(1.6), c(1.1)] },
  { id: "rose", name: "Rose", steps: [sep(0.18), s(1.3), h(-18), b(1.05)] },
  { id: "vintage", name: "Vintage", steps: [sep(0.45), c(0.9), b(1.05), s(0.85)] },
  { id: "fade", name: "Fade", steps: [c(0.8), b(1.1), s(0.8)] },
  { id: "drama", name: "Drama", steps: [c(1.35), s(1.15), b(0.92)] },
  { id: "mono", name: "B&W", steps: [g(1), c(1.1)] },
  { id: "noir", name: "Noir", steps: [g(1), c(1.45), b(0.9)] },
];

export function filterById(id: string): StoryFilter {
  return FILTERS.find((filter) => filter.id === id) ?? FILTERS[0]!;
}

/** "sepia(0.22) saturate(1.25) ..." - for a CSS filter and a canvas's ctx.filter. */
export function cssFilter(steps: FilterStep[]): string {
  if (!steps.length) return "none";
  return steps
    .map((step) => (step.type === "hue-rotate" ? `hue-rotate(${step.deg}deg)` : `${step.type}(${step.amount})`))
    .join(" ");
}

/** The same steps as React Native's filter style (Android draws all of them). */
export function nativeFilter(steps: FilterStep[]): object[] {
  return steps.map((step) => {
    switch (step.type) {
      case "hue-rotate":
        return { hueRotate: `${step.deg}deg` };
      default:
        return { [step.type]: step.amount };
    }
  });
}

type Matrix = number[]; // 3 x 3, row major

function stepMatrix(step: FilterStep): { m: Matrix; add: number } {
  switch (step.type) {
    case "brightness":
      return { m: [step.amount, 0, 0, 0, step.amount, 0, 0, 0, step.amount], add: 0 };
    case "contrast":
      return { m: [step.amount, 0, 0, 0, step.amount, 0, 0, 0, step.amount], add: 0.5 - 0.5 * step.amount };
    case "saturate": {
      const v = step.amount;
      return {
        m: [
          0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v,
          0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v,
          0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v,
        ],
        add: 0,
      };
    }
    case "grayscale": {
      const v = 1 - Math.min(1, step.amount);
      return {
        m: [
          0.2126 + 0.7874 * v, 0.7152 - 0.7152 * v, 0.0722 - 0.0722 * v,
          0.2126 - 0.2126 * v, 0.7152 + 0.2848 * v, 0.0722 - 0.0722 * v,
          0.2126 - 0.2126 * v, 0.7152 - 0.7152 * v, 0.0722 + 0.9278 * v,
        ],
        add: 0,
      };
    }
    case "sepia": {
      const v = 1 - Math.min(1, step.amount);
      return {
        m: [
          0.393 + 0.607 * v, 0.769 - 0.769 * v, 0.189 - 0.189 * v,
          0.349 - 0.349 * v, 0.686 + 0.314 * v, 0.168 - 0.168 * v,
          0.272 - 0.272 * v, 0.534 - 0.534 * v, 0.131 + 0.869 * v,
        ],
        add: 0,
      };
    }
    case "hue-rotate": {
      const a = (step.deg * Math.PI) / 180;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      return {
        m: [
          0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
          0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.14, 0.072 - cos * 0.072 - sin * 0.283,
          0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
        ],
        add: 0,
      };
    }
  }
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** One colour (0-1 each) through the steps, as CSS does it: in order, clamped after each. */
export function filterColor(rgb: [number, number, number], steps: FilterStep[]): [number, number, number] {
  let [r, g2, bl] = rgb;
  for (const step of steps) {
    const { m, add } = stepMatrix(step);
    const nr = clamp(m[0]! * r + m[1]! * g2 + m[2]! * bl + add);
    const ng = clamp(m[3]! * r + m[4]! * g2 + m[5]! * bl + add);
    const nb = clamp(m[6]! * r + m[7]! * g2 + m[8]! * bl + add);
    r = nr;
    g2 = ng;
    bl = nb;
  }
  return [r, g2, bl];
}

/** For a browser whose canvas has no ctx.filter: the steps on the pixels directly. */
export function filterPixels(data: Uint8ClampedArray, steps: FilterStep[]) {
  if (!steps.length) return;
  for (let i = 0; i < data.length; i += 4) {
    const [r, gg, bb] = filterColor([data[i]! / 255, data[i + 1]! / 255, data[i + 2]! / 255], steps);
    data[i] = Math.round(r * 255);
    data[i + 1] = Math.round(gg * 255);
    data[i + 2] = Math.round(bb * 255);
  }
}
