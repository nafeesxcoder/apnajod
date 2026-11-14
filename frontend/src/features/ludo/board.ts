/**
 * The Ludo board as a 15 x 15 grid. Pure geometry so it can be tested:
 * where each square is, and where a token stands for a given progress
 * (the same numbers the server uses: -1 yard, 0-50 track, 51-55 home
 * column, 56 home).
 *
 * Seat 0 red (top left), 1 green (top right), 2 yellow (bottom right),
 * 3 blue (bottom left). Everyone goes round clockwise.
 */

export type Cell = { r: number; c: number };

export const SEAT_COLORS = ["#E53935", "#43A047", "#F9C80E", "#1E88E5"] as const;
export const SEAT_TINTS = ["#FDECEA", "#E8F5E9", "#FFF8DC", "#E3F2FD"] as const;
export const SEAT_NAMES = ["Red", "Green", "Yellow", "Blue"] as const;
export const START = [0, 13, 26, 39] as const;
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const STARS = new Set([8, 21, 34, 47]);

/** The 52 squares of the track, clockwise from red's start. */
export const TRACK: Cell[] = (() => {
  const cells: Cell[] = [];
  const run = (r: number, c: number, dr: number, dc: number, n: number) => {
    for (let i = 0; i < n; i += 1) cells.push({ r: r + dr * i, c: c + dc * i });
  };
  run(6, 1, 0, 1, 5); // red's row, going right
  run(5, 6, -1, 0, 6); // up
  run(0, 7, 0, 0, 1); // across the top
  run(0, 8, 1, 0, 6); // down (green starts at the 2nd)
  run(6, 9, 0, 1, 6); // right
  run(7, 14, 0, 0, 1); // the right edge
  run(8, 14, 0, -1, 6); // left (yellow starts at the 2nd)
  run(9, 8, 1, 0, 6); // down
  run(14, 7, 0, 0, 1); // the bottom edge
  run(14, 6, -1, 0, 6); // up (blue starts at the 2nd)
  run(8, 5, 0, -1, 6); // left
  run(7, 0, 0, 0, 1); // the left edge
  run(6, 0, 0, 0, 1); // back to just before red's start
  return cells;
})();

/** Each colour's 5 home-column squares, in the order they are walked. */
export const HOME_COLUMNS: Cell[][] = [
  [1, 2, 3, 4, 5].map((c) => ({ r: 7, c })),
  [1, 2, 3, 4, 5].map((r) => ({ r, c: 7 })),
  [13, 12, 11, 10, 9].map((c) => ({ r: 7, c })),
  [13, 12, 11, 10, 9].map((r) => ({ r, c: 7 })),
];

/** The top-left corner of each colour's yard (6 x 6). */
export const YARDS: Cell[] = [
  { r: 0, c: 0 },
  { r: 0, c: 9 },
  { r: 9, c: 9 },
  { r: 9, c: 0 },
];

/** Where a token's centre is, in cell units (0.5 = middle of the first cell). */
export type Point = { x: number; y: number };

const centre = (cell: Cell): Point => ({ x: cell.c + 0.5, y: cell.r + 0.5 });

const YARD_SPOTS = [
  { y: 1.75, x: 1.75 },
  { y: 1.75, x: 4.25 },
  { y: 4.25, x: 1.75 },
  { y: 4.25, x: 4.25 },
];

/** Home: each colour's triangle in the middle. */
const HOME_POINTS: Point[] = [
  { x: 6.45, y: 7.5 },
  { x: 7.5, y: 6.45 },
  { x: 8.55, y: 7.5 },
  { x: 7.5, y: 8.55 },
];

export function pointFor(seat: number, progress: number, token: number): Point {
  if (progress < 0) {
    const yard = YARDS[seat]!;
    const spot = YARD_SPOTS[token]!;
    return { x: yard.c + spot.x, y: yard.r + spot.y };
  }
  if (progress <= 50) return centre(TRACK[(START[seat]! + progress) % 52]!);
  if (progress <= 55) return centre(HOME_COLUMNS[seat]![progress - 51]!);
  const home = HOME_POINTS[seat]!;
  // The four that are home sit side by side in the triangle.
  const spread = (token - 1.5) * 0.28;
  return seat % 2 === 0 ? { x: home.x, y: home.y + spread } : { x: home.x + spread, y: home.y };
}

/** The squares a token passes through, one step at a time, for the animation. */
export function pathFor(seat: number, from: number, to: number, token: number): Point[] {
  if (to < 0) return [pointFor(seat, -1, token)];
  if (from < 0) return [pointFor(seat, 0, token)];
  const steps: Point[] = [];
  for (let p = from + 1; p <= to; p += 1) steps.push(pointFor(seat, p, token));
  return steps;
}

/** The track square a token is on (for stacking tokens that share one), or null. */
export function squareKey(seat: number, progress: number, token: number) {
  if (progress < 0) return `yard-${seat}-${token}`;
  if (progress <= 50) return `t${(START[seat]! + progress) % 52}`;
  if (progress <= 55) return `h${seat}-${progress}`;
  return `home-${seat}-${token}`;
}
