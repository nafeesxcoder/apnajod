/** Words for a Ludo room in a list. Pure, so it can be tested. */
import type { LudoGame } from "../../api/ludoApi";

export function ludoRoomLabel(game: LudoGame, myId: string) {
  const host = game.members.find((m) => m.userId === game.hostId);
  const me = game.members.find((m) => m.userId === myId);
  const joined = game.members.filter((m) => m.status === "joined").length;
  const others = game.members
    .filter((m) => m.userId !== myId && (m.status === "joined" || m.status === "invited"))
    .map((m) => m.name.split(" ")[0])
    .join(", ");

  if (game.status === "playing") {
    const myTurn = game.state?.turnUserId === myId;
    return { title: `Ludo with ${others || "friends"}`, detail: myTurn ? "Your turn!" : "Game on", action: "Open", urgent: myTurn };
  }
  if (me?.status === "invited") {
    return { title: `${host?.name ?? "Someone"} invited you to Ludo`, detail: `${game.maxPlayers} players · ${joined} joined`, action: "Join", urgent: true };
  }
  return { title: `Ludo room · ${game.maxPlayers} players`, detail: `${joined} of ${game.maxPlayers} joined`, action: "Open", urgent: false };
}

/** A tapped Ludo invite on the website arrives as /?ludo=<gameId>: take it out of the address. */
export function takeLudoParam(): string | null {
  if (typeof window === "undefined" || !window.location?.search) return null;
  try {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("ludo");
    if (!id) return null;
    url.searchParams.delete("ludo");
    window.history.replaceState(window.history.state, "", url.toString());
    return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  } catch {
    return null;
  }
}
