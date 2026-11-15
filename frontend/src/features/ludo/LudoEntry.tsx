/**
 * The Ludo card at the top of Games: start a new game, and every room you
 * are invited to or playing in, kept fresh over the socket.
 */
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { type LudoGame, ludoApi } from "../../api/ludoApi";
import { getChatSocket } from "../../api/chatSocket";
import { whiteCard } from "../../components/brand";
import { PressScale } from "../../components/motion";
import { colors, fonts, palette, radius, typeScale } from "../../theme";
import { SEAT_COLORS } from "./board";
import { ludoRoomLabel } from "./ludoText";

export function LudoEntry({
  accessToken,
  myId,
  canCreate,
  onOpen,
}: {
  accessToken: string;
  myId: string;
  canCreate: boolean;
  onOpen: (gameId: string | null) => void;
}) {
  const [games, setGames] = useState<LudoGame[]>([]);

  const load = useCallback(() => {
    ludoApi
      .mine(accessToken)
      .then((list) => setGames(list.filter((g) => g.status === "waiting" || g.status === "playing")))
      .catch(() => undefined);
  }, [accessToken]);

  useEffect(() => {
    load();
    const socket = getChatSocket();
    if (!socket) return;
    socket.on("ludo:update", load);
    return () => {
      socket.off("ludo:update", load);
    };
  }, [load]);

  if (!canCreate && games.length === 0) return null;

  return (
    <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 14 }}>
      {canCreate && (
        <PressScale
          accessibilityRole="button"
          accessibilityLabel="Play Ludo with 2 to 4 players and live voice"
          onPress={() => onOpen(null)}
          style={{ borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#2B1466", padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 14, overflow: "hidden", flexDirection: "row", flexWrap: "wrap" }}>
            {SEAT_COLORS.map((c) => (
              <View key={c} style={{ width: 28, height: 28, backgroundColor: c, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF" }} />
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, color: "#FFFFFF" }}>Ludo 🎲</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: "#D1D5DB", marginTop: 2 }}>2, 3 or 4 players · talk live on mic</Text>
          </View>
          <View style={{ backgroundColor: "#16A34A", borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#FFFFFF" }}>Play</Text>
          </View>
        </PressScale>
      )}
      {games.map((g) => {
        const label = ludoRoomLabel(g, myId);
        return (
          <PressScale
            key={g.id}
            accessibilityRole="button"
            accessibilityLabel={`${label.title}. ${label.action}`}
            onPress={() => onOpen(g.id)}
            style={[whiteCard, { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.md }]}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: label.urgent ? "#FEE2E2" : "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={label.urgent ? "notifications" : "dice-outline"} size={20} color={label.urgent ? palette.crimson : colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: typeScale.body, color: colors.text }}>
                {label.title}
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: typeScale.label, color: colors.muted }}>
                {label.detail}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.crimson }}>{label.action}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}
