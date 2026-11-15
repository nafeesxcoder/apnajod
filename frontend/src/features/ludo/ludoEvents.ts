/**
 * What happened between two looks at a Ludo game: which sounds to play and
 * which big word to flash on the board ("CUT!", "HOME!", "SIX!").
 * Pure, so it can be tested; the steps of a moving token make their own
 * sound as they walk.
 */
import type { LudoGame } from "../../api/ludoApi";

export type LudoCue = "dice" | "six" | "out" | "cut" | "home" | "turn" | "win";
export type LudoBanner = { kind: "cut" | "home" | "six" | "lost" | "none"; text: string; sub?: string };

export function clampVolume(value: number) {
  if (!Number.isFinite(value)) return 0.8;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function ludoChange(prev: LudoGame | null, next: LudoGame, myId: string): { sounds: LudoCue[]; banner: LudoBanner | null } {
  const sounds: LudoCue[] = [];
  let banner: LudoBanner | null = null;
  const before = prev?.state;
  const after = next.state;
  if (!after) return { sounds, banner };
  if (!before) {
    // The game has just started.
    if (prev?.status === "waiting" && after.turnUserId === myId) sounds.push("turn");
    return { sounds, banner };
  }
  if (after.moveNo === before.moveNo && after.finished === before.finished) return { sounds, banner };

  const name = (userId: string) => (userId === myId ? "You" : next.members.find((m) => m.userId === userId)?.name ?? "");
  const last = after.last;
  if (last && after.moveNo !== before.moveNo) {
    if (last.type === "roll" || last.type === "no_move" || last.type === "three_sixes") {
      // My own roll already rattled when I tapped.
      if (last.userId !== myId) sounds.push("dice");
      if (last.type === "three_sixes") banner = { kind: "lost", text: "3 SIXES", sub: `${name(last.userId)} lost the turn` };
      else if (last.dice === 6) {
        sounds.push("six");
        banner = { kind: "six", text: "SIX!", sub: last.userId === myId ? "Roll again after this" : undefined };
      } else if (last.type === "no_move" && last.userId === myId) banner = { kind: "none", text: "No move", sub: `You rolled ${last.dice}` };
    } else if (last.type === "move") {
      if (last.from === -1) sounds.push("out");
      if (last.cut.length) {
        sounds.push("cut");
        const victims = last.cut.map((c) => (c.userId === myId ? "you" : name(c.userId))).join(", ");
        banner = { kind: "cut", text: "CUT!", sub: `${name(last.userId)} cut ${victims}` };
      } else if (last.to === 56) {
        sounds.push("home");
        banner = { kind: "home", text: "HOME!", sub: `${name(last.userId)} got a token home` };
      }
    }
  }
  if (after.finished && !before.finished) sounds.push("win");
  else if (after.turnUserId === myId && before.turnUserId !== myId) sounds.push("turn");
  return { sounds, banner };
}
