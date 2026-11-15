/**
 * A Ludo invite in a chat: "Let's play Ludo! · 3 players" with a Join
 * button. It looks the room up so it can say when the game has started or
 * is over, and stays fresh as the room changes.
 */
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { PressScale } from "../../components/motion";

import { type LudoGame, ludoApi } from "../../api/ludoApi";
import { getChatSocket } from "../../api/chatSocket";
import { fonts } from "../../theme";
import { SEAT_COLORS } from "./board";
import { ludoInviteState } from "./ludoText";

export function LudoInviteCard({
  invite,
  mine,
  accessToken,
  myId,
  onOpen,
}: {
  invite: { gameId: string; maxPlayers: number };
  mine: boolean;
  accessToken?: string;
  myId?: string;
  onOpen?: (gameId: string) => void;
}) {
  const [game, setGame] = useState<LudoGame | null | undefined>(undefined);

  const load = useCallback(() => {
    if (!accessToken) return;
    ludoApi
      .get(accessToken, invite.gameId)
      .then(setGame)
      .catch(() => setGame(null));
  }, [accessToken, invite.gameId]);

  useEffect(() => {
    load();
    const socket = getChatSocket();
    if (!socket) return;
    const onUpdate = (next: LudoGame) => {
      if (next?.id === invite.gameId) setGame(next);
    };
    socket.on("ludo:update", onUpdate);
    return () => {
      socket.off("ludo:update", onUpdate);
    };
  }, [load, invite.gameId]);

  const state = ludoInviteState(game, myId ?? "", mine);
  const canOpen = !!onOpen && state.action !== null;

  return (
    <View
      accessibilityLabel={`Ludo invite, ${invite.maxPlayers} players. ${state.line}`}
      style={{ width: 236, borderRadius: 20, overflow: "hidden", backgroundColor: "#1B1145" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", flexDirection: "row", flexWrap: "wrap", transform: [{ rotate: "-8deg" }] }}>
          {SEAT_COLORS.map((c) => (
            <View key={c} style={{ width: 26, height: 26, backgroundColor: c, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.92)" }} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 19, color: "#FFFFFF" }}>Let's play Ludo!</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: "#C4B5FD", marginTop: 2 }}>
            {invite.maxPlayers} players · talk live on mic 🎙️
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingBottom: 14 }}>
        <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 12.5, color: state.live ? "#86EFAC" : "#E9D5FF" }}>{state.line}</Text>
        {canOpen && (
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={state.action === "Join" ? "Join Ludo game" : "Open Ludo game"}
            onPress={() => onOpen?.(invite.gameId)}
            scaleTo={0.95}
            style={{ backgroundColor: state.action === "Join" ? "#22C55E" : "#FACC15", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}
          >
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#14092E" }}>{state.action}</Text>
          </PressScale>
        )}
      </View>
    </View>
  );
}
