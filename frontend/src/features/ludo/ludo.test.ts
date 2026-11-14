import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { HOME_COLUMNS, pathFor, pointFor, squareKey, START, TRACK, YARDS } from "./board";
import { ludoRoomLabel } from "./ludoText";
import { pushTarget } from "../../app/push/nativePush";
import type { LudoGame } from "../../api/ludoApi";

const read = (p: string) => readFileSync(join(__dirname, "..", "..", "..", p), "utf8");
const near = (a: { r: number; c: number }, b: { r: number; c: number }) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
// The four inner corners of the cross are crossed with one diagonal step.
const step = (a: { r: number; c: number }, b: { r: number; c: number }) => Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c)) === 1;

describe("Ludo board", () => {
  it("has 52 different track squares, each one step from the one before", () => {
    expect(TRACK).toHaveLength(52);
    expect(new Set(TRACK.map((s) => `${s.r},${s.c}`)).size).toBe(52);
    TRACK.forEach((sq, i) => expect(step(sq, TRACK[(i + 1) % 52]!)).toBe(true));
    expect(TRACK.filter((sq, i) => !near(sq, TRACK[(i + 1) % 52]!))).toHaveLength(4);
  });

  it("leads every colour from its last track square into its own home column", () => {
    for (let seat = 0; seat < 4; seat += 1) {
      const last = TRACK[(START[seat]! + 50) % 52]!;
      const column = HOME_COLUMNS[seat]!;
      expect(column).toHaveLength(5);
      expect(near(last, column[0]!)).toBe(true);
      column.slice(1).forEach((sq, i) => expect(near(sq, column[i]!)).toBe(true));
    }
  });

  it("starts each colour beside its own yard", () => {
    for (let seat = 0; seat < 4; seat += 1) {
      const start = TRACK[START[seat]!]!;
      const yard = YARDS[seat]!;
      const inside = (v: number, from: number) => v >= from - 1 && v <= from + 6;
      expect(inside(start.r, yard.r) && inside(start.c, yard.c)).toBe(true);
    }
  });

  it("walks a token square by square, and straight out of the yard", () => {
    expect(pathFor(0, 3, 7, 0)).toHaveLength(4);
    expect(pathFor(0, -1, 0, 2)).toEqual([pointFor(0, 0, 2)]);
    expect(pathFor(1, 50, 56, 0)).toHaveLength(6);
  });

  it("stacks tokens that share a track square, but never in the yard", () => {
    expect(squareKey(0, 13, 0)).toBe(squareKey(1, 0, 3));
    expect(squareKey(0, -1, 0)).not.toBe(squareKey(0, -1, 1));
  });
});

const game = (over: Partial<LudoGame>): LudoGame =>
  ({
    id: "g1",
    hostId: "host",
    isHost: false,
    maxPlayers: 3,
    status: "waiting",
    version: 1,
    turnDeadline: null,
    turnSeconds: 30,
    members: [
      { userId: "host", name: "Aarav Sharma", photo: null, status: "joined", seat: null, color: null },
      { userId: "me", name: "Anaya", photo: null, status: "invited", seat: null, color: null },
      { userId: "x", name: "Sana", photo: null, status: "invited", seat: null, color: null },
    ],
    state: null,
    ...over,
  }) as LudoGame;

describe("Ludo rooms in Games", () => {
  it("shows an invite with Join, and your turn first", () => {
    expect(ludoRoomLabel(game({}), "me")).toMatchObject({ title: "Aarav Sharma invited you to Ludo", action: "Join", urgent: true });
    const playing = game({ status: "playing", state: { turnUserId: "me" } as LudoGame["state"] });
    expect(ludoRoomLabel(playing, "me")).toMatchObject({ detail: "Your turn!", action: "Open" });
  });

  it("opens the game room from a tapped invite", () => {
    expect(pushTarget({ ludoGameId: "g1" })).toEqual({ ludo: "g1" });
  });

  it("is wired into Games, the app and notifications", () => {
    const shell = read("src/app/MilaanApp.tsx");
    expect(read("src/features/games/GamesScreen.tsx")).toContain("<LudoEntry");
    expect(shell).toContain('screen === "ludo"');
    expect(shell).toContain("onOpenLudo: (gameId) => setPendingLudo(gameId)");
    expect(read("public/sw.js")).toContain("open-ludo");
    expect(read("src/app/navigation/types.ts")).toContain('| "ludo"');
  });

  it("plays on 2, 3 or 4 players with live voice, and turns the mic off on leaving", () => {
    const screen = read("src/features/ludo/LudoScreen.tsx");
    expect(screen).toContain("[2, 3, 4].map");
    expect(screen).toContain("new VoiceRoom(");
    expect(screen).toContain("voiceRef.current?.stop()");
    expect(screen).toContain('socket.on("ludo:update"');
  });
});
