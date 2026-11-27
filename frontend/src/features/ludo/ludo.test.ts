import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { HOME_COLUMNS, pathFor, pointFor, squareKey, START, TRACK, YARDS } from "./board";
import { ludoInviteState, ludoRoomLabel } from "./ludoText";
import { clampVolume, ludoChange } from "./ludoEvents";
import { allowedPrefs, BOARD_THEMES, cleanPrefs, DEFAULT_PREFS, DICE_SKINS, SOUND_PACKS, splitKey, stepMs, TOKEN_STYLES } from "./ludoLooks";
import { spinLanding } from "./ludoText";
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

describe("Ludo sounds and big moments", () => {
  const base = (state: Partial<NonNullable<LudoGame["state"]>>, over: Partial<LudoGame> = {}): LudoGame =>
    game({
      status: "playing",
      members: [
        { userId: "me", name: "Anaya", photo: null, status: "joined", seat: 0, color: "red" },
        { userId: "x", name: "Sana", photo: null, status: "joined", seat: 2, color: "yellow" },
      ],
      state: { players: [], turnUserId: "x", dice: null, rolled: false, movable: [], last: null, places: [], winner: null, finished: false, moveNo: 1, ...state } as LudoGame["state"],
      ...over,
    });

  it("rattles someone else's dice, shouts SIX on a 6 and rings when it is my turn", () => {
    const before = base({ moveNo: 4 });
    const six = ludoChange(before, base({ moveNo: 5, dice: 6, last: { type: "roll", userId: "x", dice: 6 } }), "me");
    expect(six.sounds).toEqual(["dice", "six"]);
    expect(six.banner?.text).toBe("SIX!");
    const mine = ludoChange(before, base({ moveNo: 5, last: { type: "no_move", userId: "x", dice: 3 }, turnUserId: "me" }), "me");
    expect(mine.sounds).toEqual(["dice", "turn"]);
    // My own roll already made its sound when I tapped.
    expect(ludoChange(before, base({ moveNo: 5, dice: 4, last: { type: "roll", userId: "me", dice: 4 } }), "me").sounds).toEqual([]);
  });

  it("cuts, gets home, brings a token out and wins with the right sound and word", () => {
    const before = base({ moveNo: 8 });
    const cut = ludoChange(before, base({ moveNo: 9, last: { type: "move", userId: "x", token: 0, from: 3, to: 9, dice: 6, cut: [{ userId: "me", token: 1 }] } }), "me");
    expect(cut.sounds).toEqual(["cut"]);
    expect(cut.banner).toMatchObject({ kind: "cut", text: "CUT!", sub: "Sana cut you" });
    const home = ludoChange(before, base({ moveNo: 9, last: { type: "move", userId: "me", token: 0, from: 52, to: 56, dice: 4, cut: [] } }), "me");
    expect(home.sounds).toEqual(["home"]);
    expect(ludoChange(before, base({ moveNo: 9, last: { type: "move", userId: "x", token: 0, from: -1, to: 0, dice: 6, cut: [] } }), "me").sounds).toEqual(["out"]);
    const won = ludoChange(before, base({ moveNo: 9, finished: true, turnUserId: null, last: { type: "move", userId: "me", token: 3, from: 50, to: 56, dice: 6, cut: [] } }), "me");
    expect(won.sounds).toEqual(["home", "win"]);
    expect(ludoChange(before, before, "me").sounds).toEqual([]);
  });

  it("keeps the volume between 0 and 1", () => {
    expect(clampVolume(1.7)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(0.333)).toBe(0.33);
    expect(clampVolume(Number.NaN)).toBe(0.8);
  });

  it("ships our own sounds and a volume control", () => {
    for (const pack of SOUND_PACKS) {
      for (const name of ["dice", "step", "out", "cut", "home", "turn", "six", "tick", "win"]) {
        expect(existsSync(join(__dirname, "../../../assets/sounds/ludo", pack, `${name}.mp3`))).toBe(true);
      }
    }
    const bits = read("src/features/ludo/LudoBits.tsx");
    expect(bits).toContain('accessibilityLabel="Game sound and volume"');
    expect(bits).toContain("ludoSound.set({ volume: level, muted: false })");
    expect(read("src/features/ludo/LudoBoard.tsx")).toContain("setTimeout(onStep, stepMs * (i + 1))");
  });
});

describe("Ludo invites in chat", () => {
  it("says Join, then Game on, then who won, and closes with the room", () => {
    expect(ludoInviteState(undefined, "me", false)).toMatchObject({ action: "Join" });
    expect(ludoInviteState(game({}), "me", false)).toMatchObject({ line: "1 of 3 joined", action: "Join" });
    const playing = game({ status: "playing", state: { players: [{ userId: "me" }], turnUserId: "x" } as unknown as LudoGame["state"] });
    expect(ludoInviteState(playing, "me", false)).toMatchObject({ line: "Game on! 🎲", action: "Open", live: true });
    const done = game({ status: "finished", state: { winner: "host" } as unknown as LudoGame["state"] });
    expect(ludoInviteState(done, "me", false).line).toBe("Aarav Sharma won 🏆");
    expect(ludoInviteState(null, "me", false)).toMatchObject({ line: "This room was closed", action: null });
  });

  it("shows the card in the chat and opens the room from it", () => {
    const chat = read("src/features/chat/ChatFeature.tsx");
    expect(chat).toContain('message.type === "ludo" && message.ludo && (');
    expect(chat).toContain("onOpen={onOpenLudo}");
    expect(read("src/app/MilaanApp.tsx")).toContain('setLudoReturn("chat");');
  });
});

describe("Ludo settings, store and the daily spin", () => {
  it("has six boards, seven sound packs, five dice and four tokens", () => {
    expect(Object.keys(BOARD_THEMES)).toHaveLength(6);
    expect(SOUND_PACKS).toHaveLength(7);
    expect(Object.keys(DICE_SKINS)).toHaveLength(5);
    expect(Object.keys(TOKEN_STYLES)).toHaveLength(4);
  });

  it("matches the server's store: every board, sound, dice and token key has a look", () => {
    const server = read("../backend/src/services/coinService.js");
    const keys = [...server.matchAll(/key: "(theme|sound|dice|token)\.([a-z]+)"/g)].map((m) => [m[1] ?? "", m[2] ?? ""] as const);
    expect(keys.length).toBe(22);
    for (const [kind, look] of keys) {
      const table = { theme: BOARD_THEMES, dice: DICE_SKINS, token: TOKEN_STYLES } as Record<string, Record<string, unknown>>;
      if (kind === "sound") expect(SOUND_PACKS).toContain(look);
      else expect(table[kind]![look]).toBeTruthy();
    }
  });

  it("keeps settings sane, and only uses what you have unlocked", () => {
    expect(cleanPrefs({ theme: "lava", sound: "dhol", speed: "warp", vibrate: false })).toEqual({ ...DEFAULT_PREFS, sound: "dhol", vibrate: false });
    const free = ["theme.royal", "sound.classic", "dice.classic", "token.glossy"];
    expect(allowedPrefs({ ...DEFAULT_PREFS, theme: "diwali", dice: "gold" }, free)).toMatchObject({ theme: "royal", dice: "classic" });
    expect(allowedPrefs({ ...DEFAULT_PREFS, theme: "diwali" }, [...free, "theme.diwali"]).theme).toBe("diwali");
    expect(splitKey("dice.galaxy")).toEqual({ kind: "dice", look: "galaxy" });
    expect(stepMs("fast")).toBeLessThan(stepMs("normal"));
  });

  it("lands the spinner with the prize under the pointer", () => {
    for (let i = 0; i < 8; i += 1) {
      const centre = (i + 0.5) * 45;
      expect((centre + spinLanding(i, 8, 5)) % 360).toBe(0);
      expect(spinLanding(i, 8, 5)).toBeGreaterThan(5 * 360 - 1);
    }
  });

  it("is wired in: store, coins, emoji, rewards and the spinner on Home", () => {
    const screen = read("src/features/ludo/LudoScreen.tsx");
    expect(screen).toContain('accessibilityLabel="Ludo settings and store"');
    expect(screen).toContain('getChatSocket()?.emit("ludo:react"');
    expect(screen).toContain("state.rewards?.[myId]");
    expect(screen).toContain("tokenStyle={TOKEN_STYLES[prefs.token]!}");
    expect(read("src/app/MilaanApp.tsx")).not.toContain("DailySpinHost");
    expect(read("src/features/ludo/LudoScreen.tsx")).toContain("<DailySpinHost accessToken={accessToken} />");
    expect(read("src/features/ludo/LudoStore.tsx")).toContain("coinsApi.unlock(accessToken, item.key)");
  });
});
